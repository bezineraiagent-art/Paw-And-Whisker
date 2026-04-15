import { Router } from "express";
import { db, subscribers, insertSubscriberSchema } from "@workspace/db";

const router = Router();

router.post("/subscribers", async (req, res) => {
  try {
    const parsed = insertSubscriberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    await db.insert(subscribers).values(parsed.data);
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save subscriber email");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
