import { Router } from "express";

import {
  uploadFiles,
} from "../services/fileValidation.service.js";

import {
  mergePdfController,
} from "../controllers/pdf.controller.js";

const router = Router();

router.post(
  "/merge-memory",
  uploadFiles,
  mergePdfController
);

export default router;