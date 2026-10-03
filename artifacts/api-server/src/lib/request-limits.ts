import { createHash, randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Short-lived, salted rate-limit keys. No raw IPs, coordinates or search strings are retained.
const salt = randomBytes(32).toString("hex");
export function requestLimit(limit: number, windowMs = 60_000) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.expires <= now) buckets.delete(key);
    const key = createHash("sha256").update(salt + (req.ip ?? req.socket.remoteAddress ?? "")).digest("hex");
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= 4096) { res.status(429).json({ error: "The service is busy. Please try again shortly." }); return; }
      bucket = { count: 0, expires: now + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.expires - now) / 1000));
      res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
      return;
    }
    next();
  };
}