import { Router } from "express";
import { db, subscribers } from "@workspace/db";
import { CapturePdfEmailBody } from "@workspace/api-zod";

const router = Router();

router.post("/subscribers", async (req, res) => {
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

export default router;
