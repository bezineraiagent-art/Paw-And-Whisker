import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createProxyTrust } from "./lib/client-ip";
import { securityHeaders } from "../../../scripts/security-headers.mjs";
import { retiredLegacyChat } from "./lib/retired-chat";

const app: Express = express();
app.set("trust proxy", createProxyTrust());
app.use((req, res, next) => {
  for (const [name, value] of Object.entries(securityHeaders({ development: process.env.NODE_ENV !== "production" }))) res.setHeader(name, value);
  // Never allow shared/browser caches to retain protected leads or AI data.
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Retired endpoints never parse submitted legacy images or touch stored data.
app.use("/api/openai", retiredLegacyChat);
const smallJson = express.json({ limit: "20kb" });
const photoJson = express.json({ limit: "4mb" });
app.use((req, res, next) => (req.path === "/api/companion/message" ? photoJson : smallJson)(req, res, next));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use("/api", router);

// Body-parser errors can contain parts of a submitted body. Do not log those,
// especially transient photos and visitor coordinates.
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
  req.log.warn({ status }, "Request failed; submitted content omitted");
  res.status(status === 413 ? 413 : status === 400 ? 400 : 500).json({
    error: status === 413 ? "That request is too large. Please choose a smaller photo." : status === 400 ? "Invalid request body." : "The request could not be completed.",
  });
});
export default app;
