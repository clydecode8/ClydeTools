import path from "path";
import { validateUploadedFiles } from "../services/fileValidation.service.js";
import { combineToPdf } from "../services/pdf.service.js";
import { removeJobDir } from "../services/cleanup.service.js";

export async function combinePdfController(req, res, next) {
  try {
    const files = await validateUploadedFiles(req.files);

    const outputPath = path.join(req.jobDir, "clydetools-output.pdf");

    await combineToPdf(files, outputPath);

    res.download(outputPath, "clydetools-output.pdf", async (error) => {
      await removeJobDir(req.jobDir);

      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    await removeJobDir(req.jobDir);
    next(error);
  }
}