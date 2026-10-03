import { Router } from "express";
import { db, subscribers, answerReports } from "@workspace/db";
import { CapturePdfEmailBody, JoinPlusWaitlistBody, ReportWrongAnswerBody } from "@workspace/api-zod";
import { eq, and, sql } from "drizzle-orm";
import { requestLimit } from "../lib/request-limits";

const router = Router();

router.post("/subscribers", requestLimit(8, 60_000, "subscriber"), async (req, res) => {
  try {
    const parsed = CapturePdfEmailBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    await db.insert(subscribers).values({ email: parsed.data.email.trim().toLowerCase() });
    res.status(201).json({ success: true, downloadUrl: "/downloads/10-pet-symptoms.pdf" });
  } catch (err) {
    req.log.error({ err }, "Failed to save subscriber email");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/waitlist", requestLimit(8, 60_000, "waitlist"), async (req, res) => {
  const parsed = JoinPlusWaitlistBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.consent || parsed.data.fax) { res.status(400).json({ error: "Enter a valid email and agree to join the waitlist." }); return; }
  try {
    const email = parsed.data.email.trim().toLowerCase();
    await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"plus-waitlist:" + email}))`);
      const existing = await tx.select({ id: subscribers.id }).from(subscribers).where(and(eq(subscribers.email, email), eq(subscribers.source, "plus-waitlist"))).limit(1);
      if (!existing.length) await tx.insert(subscribers).values({ email, source: "plus-waitlist" });
    });
    res.status(201).json({ success: true, message: "You're on the Whisker Plus coming-soon waitlist. No payment or paid access is involved. No email has been sent." });
  } catch { req.log.error("Waitlist storage unavailable"); res.status(503).json({ error: "We couldn't save your signup. Please try again." }); }
});
router.post("/answer-reports", requestLimit(5, 60_000, "answer-report"), async (req, res) => {
  const parsed = ReportWrongAnswerBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.consent || parsed.data.fax) { res.status(400).json({ error: "Please enter an email, a report of 10–3,000 characters and consent." }); return; }
  try {
    await db.insert(answerReports).values({ email: parsed.data.email.trim().toLowerCase(), message: parsed.data.message.trim() });
    res.status(201).json({ success: true, message: "Your report was saved for manual review. No email was sent. This is not an emergency contact service." });
  } catch { res.status(503).json({ error: "We couldn't save your report. Try again or email Paul directly." }); }
});
export default router;
