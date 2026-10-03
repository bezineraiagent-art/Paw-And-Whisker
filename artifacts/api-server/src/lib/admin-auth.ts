import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  const expected = process.env.ANALYTICS_ADMIN_TOKEN;
  if (!expected) { res.status(503).json({ error: "The admin dashboard is not configured." }); return; }
  const provided = req.headers["x-admin-token"];
  if (typeof provided !== "string" || Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  next();
}