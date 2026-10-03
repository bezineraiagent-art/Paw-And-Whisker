import { Router, type IRouter } from "express";
import analyticsRouter from "./analytics";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import subscribersRouter from "./subscribers";
import companionRouter from "./companion";
import vetsRouter from "./vets";
import promotionRouter from "./promotion";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use(subscribersRouter);
router.use(companionRouter);
router.use(vetsRouter);
router.use(promotionRouter);
router.use(analyticsRouter);

export default router;
