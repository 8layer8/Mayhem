import { Router } from "express";
import { getPublicUiConfig } from "../config.js";

export const configRouter = Router();

/** Public UI settings driven by server environment variables. */
configRouter.get("/", (_req, res) => {
  res.json(getPublicUiConfig());
});
