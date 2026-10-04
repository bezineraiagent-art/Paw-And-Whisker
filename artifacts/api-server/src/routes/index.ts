import { Router, type IRouter } from "express";
import analyticsRouter from "./analytics";
import healthRouter from "./health";
import subscribersRouter from "./subscribers";
import companionRouter from "./companion";
import vetsRouter from "./vets";
import promotionRouter from "./promotion";
import { retiredLegacyChat } from "../lib/retired-chat";
import vetReviewersRouter from "./vet-reviewers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vetReviewersRouter);
// Retire the insecure legacy API without deleting any stored conversations.
router.use("/openai", retiredLegacyChat);
router.use(subscribersRouter);
router.use(companionRouter);
router.use(vetsRouter);
router.use(promotionRouter);
router.use(analyticsRouter);

export default router;
