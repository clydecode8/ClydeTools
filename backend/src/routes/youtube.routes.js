import express from "express";

import {
  downloadConversion,
  getConversionProgress,
  inspectUrl,
  startConversion,
  streamConversionProgress,
} from "../controllers/youtube.controller.js";

import {youtubeConversionRateLimiter} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/inspect", inspectUrl);
router.post("/convert", youtubeConversionRateLimiter, startConversion);
router.get("/progress/:jobId", getConversionProgress);
router.get("/download/:jobId", downloadConversion);
router.get("/events/:jobId", streamConversionProgress);

export default router;