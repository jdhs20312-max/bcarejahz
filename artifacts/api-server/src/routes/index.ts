import { Router, type IRouter } from "express";
import healthRouter from "./health";
import submissionsRouter from "./submissions";
import adminRouter from "./admin";
import controlRouter from "./control";
import sseRouter from "./sse";
import trackRouter from "./track";
import visitorsRouter from "./visitors";
import settingsRouter from "./settings";

const router: IRouter = Router();

console.log("[Routes] Loading routes...");

router.use(healthRouter);
router.use(submissionsRouter);
router.use(adminRouter);
router.use(controlRouter);
router.use(sseRouter);
router.use(trackRouter);
router.use(visitorsRouter);

console.log("[Routes] About to register settingsRouter...");
router.use(settingsRouter);
console.log("[Routes] All routes registered");

export default router;
