import { Router } from "express";
import { createJob, uploadFiles } from "../middleware/upload.js";
import { combinePdfController } from "../controllers/pdf.controller.js";

const router = Router();

router.post("/combine", createJob, uploadFiles, combinePdfController);

export default router;
