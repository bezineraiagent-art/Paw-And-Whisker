import { Router, type Request, type Response, type NextFunction } from "express";
import { and, count, countDistinct, eq, gte, lte } from "drizzle-orm";
import {
  analyticsEvents,
  db,
  insertAnalyticsEventSchema,
} from "@workspace/db";

const router = Router();

function getSessionId(req: Parameters<Router>[0]): string {
  const sessionId = req.headers["x-session-id"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : "";
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function requireAdminToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env["ANALYTICS_ADMIN_TOKEN"];
  if (!expected) {
    req.log.error(
      "ANALYTICS_ADMIN_TOKEN is not configured; refusing access to analytics summary",
    );
    res.status(503).json({
      error:
        "Analytics dashboard is not configured. Set ANALYTICS_ADMIN_TOKEN to enable.",
    });
    return;
  }

  const headerToken = req.headers["x-admin-token"];
  const provided =
    typeof headerToken === "string" ? headerToken : undefined;

  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

router.post("/analytics/events", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const parsed = insertAnalyticsEventSchema.safeParse({
      ...req.body,
      sessionId: sessionId || req.body?.sessionId || "",
    });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid analytics event" });
      return;
    }

    await db.insert(analyticsEvents).values(parsed.data);
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to record analytics event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/summary", requireAdminToken, async (req, res) => {
  try {
    const since = parseDate(req.query.since);
    const until = parseDate(req.query.until);
    if ((req.query.since && !since) || (req.query.until && !until)) {
      res.status(400).json({ error: "Invalid date in query parameters" });
      return;
    }

    const conditions = [
      since ? gte(analyticsEvents.createdAt, since) : undefined,
      until ? lte(analyticsEvents.createdAt, until) : undefined,
    ].filter((c): c is NonNullable<typeof c> => Boolean(c));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseSelect = db
      .select({
        eventName: analyticsEvents.eventName,
        source: analyticsEvents.source,
        eventCount: count().as("event_count"),
        sessionCount: countDistinct(analyticsEvents.sessionId).as(
          "session_count",
        ),
      })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.eventName, analyticsEvents.source);

    const breakdown = whereClause
      ? await baseSelect.where(whereClause)
      : await baseSelect;

    const totalSessionsRow = whereClause
      ? await db
          .select({ value: countDistinct(analyticsEvents.sessionId) })
          .from(analyticsEvents)
          .where(whereClause)
      : await db
          .select({ value: countDistinct(analyticsEvents.sessionId) })
          .from(analyticsEvents);
    const totalSessions = Number(totalSessionsRow[0]?.value ?? 0);

    const find = (eventName: string, source: string | null) =>
      breakdown.find(
        (row) => row.eventName === eventName && row.source === source,
      );

    const nudgeViewRow = find("nudge_shown", null);
    const nudgeClickRow = find("cta_click", "preview_nudge");
    const paywallClickRow = find("cta_click", "preview_paywall_card");

    const nudgeViews = Number(nudgeViewRow?.eventCount ?? 0);
    const nudgeViewSessions = Number(nudgeViewRow?.sessionCount ?? 0);
    const nudgeClicks = Number(nudgeClickRow?.eventCount ?? 0);
    const nudgeClickSessions = Number(nudgeClickRow?.sessionCount ?? 0);
    const paywallClicks = Number(paywallClickRow?.eventCount ?? 0);
    const paywallClickSessions = Number(paywallClickRow?.sessionCount ?? 0);

    const totalCtaRow = whereClause
      ? await db
          .select({ value: count() })
          .from(analyticsEvents)
          .where(and(eq(analyticsEvents.eventName, "cta_click"), whereClause))
      : await db
          .select({ value: count() })
          .from(analyticsEvents)
          .where(eq(analyticsEvents.eventName, "cta_click"));
    const totalCtaClicks = Number(totalCtaRow[0]?.value ?? 0);

    const ratio = (num: number, denom: number) =>
      denom > 0 ? Number((num / denom).toFixed(4)) : 0;

    res.json({
      period: {
        since: since?.toISOString() ?? null,
        until: until?.toISOString() ?? null,
      },
      totalSessions,
      totalCtaClicks,
      nudge: {
        views: nudgeViews,
        viewSessions: nudgeViewSessions,
        clicks: nudgeClicks,
        clickSessions: nudgeClickSessions,
        clickThroughRate: ratio(nudgeClicks, nudgeViews),
        sessionClickThroughRate: ratio(nudgeClickSessions, nudgeViewSessions),
      },
      paywallCard: {
        clicks: paywallClicks,
        clickSessions: paywallClickSessions,
        sessionConversionRate: ratio(paywallClickSessions, nudgeViewSessions),
      },
      ctaClicksBySource: breakdown
        .filter((row) => row.eventName === "cta_click")
        .map((row) => ({
          source: row.source,
          clicks: Number(row.eventCount),
          sessions: Number(row.sessionCount),
        })),
      eventCountsByName: Object.fromEntries(
        Object.entries(
          breakdown.reduce<Record<string, number>>((acc, row) => {
            acc[row.eventName] =
              (acc[row.eventName] ?? 0) + Number(row.eventCount);
            return acc;
          }, {}),
        ),
      ),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute analytics summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
