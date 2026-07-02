import fs from "fs/promises";
import { TEMP_ROOT, MAX_JOB_AGE_MS } from "../utils/paths.js";

export async function ensureTempRoot() {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
}

export async function removeJobDir(jobDir) {
  if (!jobDir) return;
  await fs.rm(jobDir, { recursive: true, force: true });
}

export async function cleanupOldJobs() {
  try {
    await ensureTempRoot();
    const entries = await fs.readdir(TEMP_ROOT, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const dirPath = `${TEMP_ROOT}/${entry.name}`;
          const stat = await fs.stat(dirPath);
          if (now - stat.mtimeMs > MAX_JOB_AGE_MS) {
            await fs.rm(dirPath, { recursive: true, force: true });
          }
        })
    );
  } catch (error) {
    console.error("Cleanup failed:", error.message);
  }
}
