import type { Request, Response } from "express";
export function retiredLegacyChat(_req: Request, res: Response) {
  res.status(410).json({ error: "This chat API has been retired. Use the free chat on the home page." });
}