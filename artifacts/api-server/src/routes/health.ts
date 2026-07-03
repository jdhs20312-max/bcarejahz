import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API Server is running!" });
});

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", message: "API Server is running!" });
});

export default router;
