import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { isImage, isPdf } from "./fileValidation.service.js";

async function imageToPdfBytes(filePath) {
  const normalized = await sharp(filePath)
    .rotate()
    .flatten({ background: "white" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedJpg(normalized);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return pdfDoc.save();
}

export async function combineToPdf(files, outputPath) {
  const outputPdf = await PDFDocument.create();

  for (const file of files) {
    if (isPdf(file.detectedMime)) {
      const pdfBytes = await fs.readFile(file.path);
      const inputPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await outputPdf.copyPages(inputPdf, inputPdf.getPageIndices());
      copiedPages.forEach((page) => outputPdf.addPage(page));
    } else if (isImage(file.detectedMime)) {
      const imagePdfBytes = await imageToPdfBytes(file.path);
      const imagePdf = await PDFDocument.load(imagePdfBytes);
      const [page] = await outputPdf.copyPages(imagePdf, [0]);
      outputPdf.addPage(page);
    }
  }

  if (outputPdf.getPageCount() === 0) {
    const error = new Error("No valid pages generated.");
    error.statusCode = 400;
    error.publicMessage = "Could not create a PDF from the uploaded files.";
    throw error;
  }

  const outputBytes = await outputPdf.save();
  await fs.writeFile(outputPath, outputBytes);
  return outputPath;
}
