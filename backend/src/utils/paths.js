import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEMP_ROOT = path.resolve(__dirname, "../../temp");
export const MAX_JOB_AGE_MS = 15 * 60 * 1000;

export function getJobDir(jobId) {
  return path.join(TEMP_ROOT, jobId);
}
