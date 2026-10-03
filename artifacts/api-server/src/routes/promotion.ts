import { Router } from "express";
import { count, desc } from "drizzle-orm";
import { db, clinicApplications, advertiserInquiries } from "@workspace/db";
import { CreateClinicApplicationBody, CreateAdvertiserInquiryBody } from "@workspace/api-zod";
import { requestLimit } from "../lib/request-limits";
import { requireAdminToken } from "../lib/admin-auth";

const router = Router();
const limit = requestLimit(8, 60_000, "promotion-intake");
function safeWebsite(value?: string) {
  if (!value?.trim()) return "";
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid website");
  return url.href;
}
router.post("/promotion/clinic-applications", limit, async (req, res) => {
  const parsed = CreateClinicApplicationBody.safeParse(req.body);
  if (!parsed.success || parsed.data.consent !== true || parsed.data.clinicName.trim().length < 2 ||
      parsed.data.city.trim().length < 2 || parsed.data.message.trim().length < 10) {
    res.status(400).json({ error: "Please complete the required fields and consent to storing your application." }); return;
  }
  let website: string;
  try { website = safeWebsite(parsed.data.website); }
  catch { res.status(400).json({ error: "Use a valid http:// or https:// website, or leave it blank." }); return; }
  try {
    const [row] = await db.insert(clinicApplications).values({
      clinicName: parsed.data.clinicName.trim(), contactName: parsed.data.contactName?.trim() ?? "",
      contactEmail: parsed.data.contactEmail.trim().toLowerCase(), city: parsed.data.city.trim(),
      website, message: parsed.data.message.trim(), intent: parsed.data.intent, consent: true,
    }).returning({ id: clinicApplications.id });
    res.status(201).json({ id: row.id, message: "Your application is saved for review. No email was sent, no listing was changed and no placement was booked." });
  } catch {
    req.log.error("Clinic application could not be saved");
    res.status(503).json({ error: "We couldn't save your application. Please try again later." });
  }
});
router.post("/promotion/advertiser-inquiries", limit, async (req, res) => {
  const parsed = CreateAdvertiserInquiryBody.safeParse(req.body);
  if (!parsed.success || parsed.data.consent !== true || parsed.data.brandName.trim().length < 2 || parsed.data.message.trim().length < 10) {
    res.status(400).json({ error: "Please complete the required fields and consent to storing your inquiry." }); return;
  }
  let website: string;
  try { website = safeWebsite(parsed.data.website); }
  catch { res.status(400).json({ error: "Use a valid http:// or https:// website, or leave it blank." }); return; }
  try {
    const [row] = await db.insert(advertiserInquiries).values({
      brandName: parsed.data.brandName.trim(), contactName: parsed.data.contactName?.trim() ?? "",
      contactEmail: parsed.data.contactEmail.trim().toLowerCase(), website,
      message: parsed.data.message.trim(), placements: [...new Set(parsed.data.placements ?? [])], consent: true,
    }).returning({ id: advertiserInquiries.id });
    res.status(201).json({ id: row.id, message: "Your media-kit request is saved for review. No email was sent and no payment or placement was booked." });
  } catch {
    req.log.error("Advertiser inquiry could not be saved");
    res.status(503).json({ error: "We couldn't save your inquiry. Please try again later." });
  }
});
router.get("/promotion/leads", requestLimit(30, 60_000, "promotion-admin"), requireAdminToken, async (req, res) => {
  try {
    const [clinics, advertisers, [clinicCount], [advertiserCount]] = await Promise.all([
      db.select().from(clinicApplications).orderBy(desc(clinicApplications.createdAt), desc(clinicApplications.id)).limit(100),
      db.select().from(advertiserInquiries).orderBy(desc(advertiserInquiries.createdAt), desc(advertiserInquiries.id)).limit(100),
      db.select({ total: count() }).from(clinicApplications),
      db.select({ total: count() }).from(advertiserInquiries),
    ]);
    res.json({ clinicApplications: clinics, advertiserInquiries: advertisers, clinicTotal: clinicCount.total, advertiserTotal: advertiserCount.total });
  } catch {
    req.log.error("Promotion leads could not be loaded");
    res.status(503).json({ error: "We couldn't load the leads. Please try again later." });
  }
});
export default router;