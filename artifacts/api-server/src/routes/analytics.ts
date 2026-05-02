import { Router, type Request, type Response, type NextFunction } from "express";
import { and, count, countDistinct, eq, gte, lte, sql } from "drizzle-orm";
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

type VariantBucket = {
  views: number;
  viewSessions: number;
  clicks: number;
  clickSessions: number;
  paywallClicks: number;
  paywallClickSessions: number;
  totalSessions: number;
  ctaClicksBySource: Record<string, { clicks: number; sessions: number }>;
  clickThroughRate: number;
  sessionClickThroughRate: number;
  paywallSessionConversionRate: number;
};

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
        variant: analyticsEvents.variant,
        eventCount: count().as("event_count"),
        sessionCount: countDistinct(analyticsEvents.sessionId).as(
          "session_count",
        ),
      })
      .from(analyticsEvents)
      .groupBy(
        analyticsEvents.eventName,
        analyticsEvents.source,
        analyticsEvents.variant,
      );

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

    const sessionsByVariantRows = whereClause
      ? await db
          .select({
            variant: analyticsEvents.variant,
            sessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .where(whereClause)
          .groupBy(analyticsEvents.variant)
      : await db
          .select({
            variant: analyticsEvents.variant,
            sessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .groupBy(analyticsEvents.variant);

    // Reset-link experiment lives in metadata.resetVariant (no schema change).
    // We extract it as text via the jsonb `->>` operator so we can group on it
    // the same way we group on the dedicated `variant` column for the nudge
    // experiment.
    const resetVariantExpr = sql<
      string | null
    >`${analyticsEvents.metadata} ->> 'resetVariant'`;

    const resetBaseSelect = db
      .select({
        eventName: analyticsEvents.eventName,
        source: analyticsEvents.source,
        resetVariant: resetVariantExpr.as("reset_variant"),
        eventCount: count().as("event_count"),
        sessionCount: countDistinct(analyticsEvents.sessionId).as(
          "session_count",
        ),
      })
      .from(analyticsEvents)
      .groupBy(
        analyticsEvents.eventName,
        analyticsEvents.source,
        resetVariantExpr,
      );

    const resetBreakdown = whereClause
      ? await resetBaseSelect.where(whereClause)
      : await resetBaseSelect;

    const sessionsByResetVariantRows = whereClause
      ? await db
          .select({
            resetVariant: resetVariantExpr.as("reset_variant"),
            sessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .where(whereClause)
          .groupBy(resetVariantExpr)
      : await db
          .select({
            resetVariant: resetVariantExpr.as("reset_variant"),
            sessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .groupBy(resetVariantExpr);

    const ratio = (num: number, denom: number) =>
      denom > 0 ? Number((num / denom).toFixed(4)) : 0;

    type BreakdownRow = (typeof breakdown)[number];
    type ResetBreakdownRow = (typeof resetBreakdown)[number];

    const computeForVariant = (
      rows: BreakdownRow[] | ResetBreakdownRow[],
      totalSessionsForVariant: number,
    ): VariantBucket => {
      const findRow = (eventName: string, source: string | null) =>
        rows.find(
          (row) => row.eventName === eventName && row.source === source,
        );

      const nudgeViewRow = findRow("nudge_shown", null);
      const nudgeClickRow = findRow("cta_click", "preview_nudge");
      const paywallClickRow = findRow("cta_click", "preview_paywall_card");

      const views = Number(nudgeViewRow?.eventCount ?? 0);
      const viewSessions = Number(nudgeViewRow?.sessionCount ?? 0);
      const clicks = Number(nudgeClickRow?.eventCount ?? 0);
      const clickSessions = Number(nudgeClickRow?.sessionCount ?? 0);
      const paywallClicksLocal = Number(paywallClickRow?.eventCount ?? 0);
      const paywallClickSessionsLocal = Number(
        paywallClickRow?.sessionCount ?? 0,
      );

      const ctaClicksBySource: VariantBucket["ctaClicksBySource"] = {};
      for (const row of rows) {
        if (row.eventName !== "cta_click") continue;
        const key = row.source ?? "unknown";
        const existing = ctaClicksBySource[key] ?? { clicks: 0, sessions: 0 };
        existing.clicks += Number(row.eventCount);
        existing.sessions += Number(row.sessionCount);
        ctaClicksBySource[key] = existing;
      }

      return {
        views,
        viewSessions,
        clicks,
        clickSessions,
        paywallClicks: paywallClicksLocal,
        paywallClickSessions: paywallClickSessionsLocal,
        totalSessions: totalSessionsForVariant,
        ctaClicksBySource,
        clickThroughRate: ratio(clicks, views),
        sessionClickThroughRate: ratio(clickSessions, viewSessions),
        // For nudge_off this is the most useful number: of all sessions
        // assigned to the variant, what fraction clicked the paywall card?
        paywallSessionConversionRate: ratio(
          paywallClickSessionsLocal,
          totalSessionsForVariant,
        ),
      };
    };

    // Build per-variant buckets. We treat null/empty as "unassigned" so legacy
    // events recorded before the experiment shipped still appear somewhere.
    const variantKey = (v: string | null | undefined) =>
      v && v.length > 0 ? v : "unassigned";

    const sessionsByVariant: Record<string, number> = {};
    for (const row of sessionsByVariantRows) {
      sessionsByVariant[variantKey(row.variant)] = Number(row.sessions ?? 0);
    }

    const rowsByVariant = breakdown.reduce<Record<string, BreakdownRow[]>>(
      (acc, row) => {
        const key = variantKey(row.variant);
        if (!acc[key]) acc[key] = [];
        acc[key]!.push(row);
        return acc;
      },
      {},
    );

    const variantNames = new Set<string>([
      ...Object.keys(sessionsByVariant),
      ...Object.keys(rowsByVariant),
    ]);

    const byVariant: Record<string, VariantBucket> = {};
    for (const v of variantNames) {
      byVariant[v] = computeForVariant(
        rowsByVariant[v] ?? [],
        sessionsByVariant[v] ?? 0,
      );
    }

    // Same shape, but pivoted by the reset-link experiment instead of the
    // nudge experiment. Lets the dashboard answer "did the reset link help or
    // hurt subscriptions?" by comparing paywallSessionConversionRate between
    // reset_on and reset_off.
    const sessionsByResetVariant: Record<string, number> = {};
    for (const row of sessionsByResetVariantRows) {
      sessionsByResetVariant[variantKey(row.resetVariant)] = Number(
        row.sessions ?? 0,
      );
    }

    const rowsByResetVariant = resetBreakdown.reduce<
      Record<string, ResetBreakdownRow[]>
    >((acc, row) => {
      const key = variantKey(row.resetVariant);
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(row);
      return acc;
    }, {});

    const resetVariantNames = new Set<string>([
      ...Object.keys(sessionsByResetVariant),
      ...Object.keys(rowsByResetVariant),
    ]);

    const byResetVariant: Record<string, VariantBucket> = {};
    for (const v of resetVariantNames) {
      byResetVariant[v] = computeForVariant(
        rowsByResetVariant[v] ?? [],
        sessionsByResetVariant[v] ?? 0,
      );
    }

    // Aggregate (legacy) totals across all variants — keeps the existing
    // dashboard shape working while the new `byVariant` block lives alongside.
    const findRows = (eventName: string, source: string | null) =>
      breakdown.filter(
        (row) => row.eventName === eventName && row.source === source,
      );
    const sumCount = (rows: BreakdownRow[]) =>
      rows.reduce((acc, row) => acc + Number(row.eventCount), 0);
    const sumSessions = (rows: BreakdownRow[]) =>
      rows.reduce((acc, row) => acc + Number(row.sessionCount), 0);

    const nudgeViewRows = findRows("nudge_shown", null);
    const nudgeClickRows = findRows("cta_click", "preview_nudge");
    const paywallClickRows = findRows("cta_click", "preview_paywall_card");

    const nudgeViews = sumCount(nudgeViewRows);
    const nudgeViewSessions = sumSessions(nudgeViewRows);
    const nudgeClicks = sumCount(nudgeClickRows);
    const nudgeClickSessions = sumSessions(nudgeClickRows);
    const paywallClicks = sumCount(paywallClickRows);
    const paywallClickSessions = sumSessions(paywallClickRows);

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

    // Compare paywall-card session conversion between variants — this is the
    // headline A/B number the task asks for.
    const nudgeOn = byVariant["nudge_on"];
    const nudgeOff = byVariant["nudge_off"];
    const variantComparison =
      nudgeOn && nudgeOff
        ? {
            paywallSessionConversionRate: {
              nudge_on: nudgeOn.paywallSessionConversionRate,
              nudge_off: nudgeOff.paywallSessionConversionRate,
              lift:
                nudgeOff.paywallSessionConversionRate > 0
                  ? Number(
                      (
                        (nudgeOn.paywallSessionConversionRate -
                          nudgeOff.paywallSessionConversionRate) /
                        nudgeOff.paywallSessionConversionRate
                      ).toFixed(4),
                    )
                  : null,
            },
            sessions: {
              nudge_on: nudgeOn.totalSessions,
              nudge_off: nudgeOff.totalSessions,
            },
          }
        : null;

    // Same comparison shape for the reset-link experiment. "lift" is reset_on
    // minus reset_off divided by reset_off — positive means showing the link
    // helped subscriptions, negative means it hurt.
    const resetOn = byResetVariant["reset_on"];
    const resetOff = byResetVariant["reset_off"];
    const resetVariantComparison =
      resetOn && resetOff
        ? {
            paywallSessionConversionRate: {
              reset_on: resetOn.paywallSessionConversionRate,
              reset_off: resetOff.paywallSessionConversionRate,
              lift:
                resetOff.paywallSessionConversionRate > 0
                  ? Number(
                      (
                        (resetOn.paywallSessionConversionRate -
                          resetOff.paywallSessionConversionRate) /
                        resetOff.paywallSessionConversionRate
                      ).toFixed(4),
                    )
                  : null,
            },
            sessions: {
              reset_on: resetOn.totalSessions,
              reset_off: resetOff.totalSessions,
            },
          }
        : null;

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
        // Denominator is total sessions across both variants. Pre-experiment
        // this was nudgeViewSessions (the nudge was always shown), but now
        // nudge_off sessions never trigger nudge_shown — keeping the old
        // denominator would only count nudge_on sessions and inflate the
        // aggregate rate. For per-variant rates, see byVariant.
        sessionConversionRate: ratio(paywallClickSessions, totalSessions),
      },
      ctaClicksBySource: breakdown
        .filter((row) => row.eventName === "cta_click")
        .reduce<{ source: string | null; clicks: number; sessions: number }[]>(
          (acc, row) => {
            const existing = acc.find((r) => r.source === row.source);
            if (existing) {
              existing.clicks += Number(row.eventCount);
              existing.sessions += Number(row.sessionCount);
            } else {
              acc.push({
                source: row.source,
                clicks: Number(row.eventCount),
                sessions: Number(row.sessionCount),
              });
            }
            return acc;
          },
          [],
        ),
      eventCountsByName: Object.fromEntries(
        Object.entries(
          breakdown.reduce<Record<string, number>>((acc, row) => {
            acc[row.eventName] =
              (acc[row.eventName] ?? 0) + Number(row.eventCount);
            return acc;
          }, {}),
        ),
      ),
      byVariant,
      variantComparison,
      byResetVariant,
      resetVariantComparison,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute analytics summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
