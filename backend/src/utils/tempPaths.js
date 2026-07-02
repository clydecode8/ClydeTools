import fs from "fs";
import path from "path";
import crypto from "crypto";

const TEMP_ROOT = path.resolve(process.cwd(), "temp");

export function ensureTempRoot() {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}

export function createJobFolder() {
  ensureTempRoot();

  const jobId = crypto.randomUUID();
  const jobDir = path.join(TEMP_ROOT, jobId);
  const inputDir = path.join(jobDir, "input");
  const outputDir = path.join(jobDir, "output");

  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  return {
    jobId,
    jobDir,
    inputDir,
    outputDir
  };
}
