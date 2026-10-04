import { Router } from "express";
import { count, desc, eq } from "drizzle-orm";
import type { SelectedFields } from "drizzle-orm/pg-core";
import { db, subscribers, answerReports, vetReviewerApplications } from "@workspace/db";
import { requireAdminToken } from "../lib/admin-auth";
import { requestLimit } from "../lib/request-limits";

const router = Router();
const limitRequests = requestLimit(60, 60_000, "inbox-admin");
for (const path of ["/admin/waitlist", "/admin/answer-reports", "/admin/vet-reviewer-applications"]) {
  router.get(path, (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  }, limitRequests, requireAdminToken, async (req, res) => {
    const offset = req.query.offset ?? "0";
    const limit = req.query.limit ?? "25";
    if (typeof offset !== "string" || typeof limit !== "string" ||
        !/^\d+$/.test(offset) || !/^\d+$/.test(limit) ||
        Number(offset) > 1_000_000 || Number(limit) < 1 || Number(limit) > 100) {
      res.status(400).json({ error: "Use an offset from 0 to 1000000 and a limit from 1 to 100." }); return;
    }
    try {
      const isWaitlist = path === "/admin/waitlist";
      const isVet = path === "/admin/vet-reviewer-applications";
      const table = isWaitlist ? subscribers : isVet ? vetReviewerApplications : answerReports;
      const where = isWaitlist ? eq(subscribers.source, "plus-waitlist") : undefined;
      const fields: SelectedFields = isWaitlist
        ? { id: subscribers.id, email: subscribers.email, createdAt: subscribers.createdAt }
        : isVet ? {
          id: vetReviewerApplications.id, email: vetReviewerApplications.email,
          createdAt: vetReviewerApplications.createdAt, name: vetReviewerApplications.name,
          credentials: vetReviewerApplications.credentials, registrationBody: vetReviewerApplications.registrationBody,
          registrationNumber: vetReviewerApplications.registrationNumber, clinic: vetReviewerApplications.clinic,
          clinicWebsite: vetReviewerApplications.clinicWebsite, message: vetReviewerApplications.message,
          consent: vetReviewerApplications.consent,
        }
        : { id: answerReports.id, email: answerReports.email, createdAt: answerReports.createdAt, message: answerReports.message };
      // One snapshot keeps the count and page consistent during concurrent submissions.
      const result = await db.transaction(async tx => {
        const records = await tx.select(fields).from(table).where(where)
          .orderBy(desc(table.createdAt), desc(table.id)).limit(Number(limit)).offset(Number(offset));
        const [total] = await tx.select({ total: count() }).from(table).where(where);
        return { records, total: total.total, offset: Number(offset), limit: Number(limit) };
      }, { isolationLevel: "repeatable read", accessMode: "read only" });
      res.json(result);
    } catch {
      req.log.error("Admin inbox could not be loaded");
      res.status(503).json({ error: "We couldn't load the inbox. Please try again later." });
    }
  });
}
export default router;