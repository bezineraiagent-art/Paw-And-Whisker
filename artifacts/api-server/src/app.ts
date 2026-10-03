import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
