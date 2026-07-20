import multer from "multer";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getJobDir } from "../utils/paths.js";

const maxFiles = Number(process.env.MAX_FILES || 10);
const maxFileMb = Number(process.env.MAX_FILE_MB || 10);

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

export async function createJob(req, _res, next) {
  try {
    req.jobId = crypto.randomUUID();
    req.jobDir = getJobDir(req.jobId);
    await fs.mkdir(req.jobDir, { recursive: true });
    next();
  } catch (error) {
    next(error);
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, req.jobDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(ext)) {
      return cb(new Error("Invalid file extension."));
    }

    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Invalid file type."));
  }

  cb(null, true);
}

export const uploadFiles = multer({
  storage,
  fileFilter,
  limits: {
    files: maxFiles,
    fileSize: maxFileMb * 1024 * 1024,
  },
}).array("files", maxFiles);