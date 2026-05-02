import { Router, type IRouter } from "express";
import analyticsRouter from "./analytics";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import subscribersRouter from "./subscribers";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use(subscribersRouter);
router.use(analyticsRouter);

export default router;
