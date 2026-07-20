import {
  validateUploadedFiles,
} from "../services/fileValidation.service.js";

import {
  mergePdfBuffers,
} from "../services/pdf.service.js";

export async function mergePdfController(req, res, next) {
  try {
    const files = await validateUploadedFiles(req.files, [
      "application/pdf",
    ]);

    const outputBuffer = await mergePdfBuffers(files);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="clydetools-merged.pdf"'
    );

    res.setHeader(
      "Content-Length",
      String(outputBuffer.length)
    );

    res.status(200).send(outputBuffer);
  } catch (error) {
    next(error);
  }
}