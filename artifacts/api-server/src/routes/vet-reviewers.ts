import { Router } from "express";
import { db, vetReviewerApplications } from "@workspace/db";
import { SubmitVetReviewerApplicationBody, type SubmissionReceipt } from "@workspace/api-zod";
import { requestLimit } from "../lib/request-limits";

const router = Router();
router.post("/vet-reviewer-applications", requestLimit(5, 60_000, "vet-reviewer-application"), async (req, res): Promise<void> => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? Object.fromEntries(Object.entries(req.body).map(([key, value]) => [key, typeof value === "string" && key !== "fax" ? value.trim() : value]))
    : req.body;
  const parsed = SubmitVetReviewerApplicationBody.safeParse(body);
  if (!parsed.success || !parsed.data.consent || parsed.data.fax) {
    res.status(400).json({ error: "Enter your contact and registration details, a message of 10–3,000 characters, and consent." }); return;
  }
  const data = parsed.data;
  if (data.clinicWebsite) {
    try { const url = new URL(data.clinicWebsite); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe URL"); }
    catch { res.status(400).json({ error: "Clinic website must be an http or https URL without login details." }); return; }
  }
  try {
    await db.insert(vetReviewerApplications).values({
      name: data.name, email: data.email.toLowerCase(), credentials: data.credentials,
      registrationBody: data.registrationBody, registrationNumber: data.registrationNumber,
      clinic: data.clinic || null, clinicWebsite: data.clinicWebsite || null,
      message: data.message, consent: true,
    });
    res.status(201).json({ success: true, message: "Your application was saved for manual review. No email was sent, and no reviewer credit has been published." } satisfies SubmissionReceipt);
  } catch {
    req.log.error("Veterinary reviewer application storage unavailable");
    res.status(503).json({ error: "We couldn't save your application. Please try again later." });
  }
});
export default router;