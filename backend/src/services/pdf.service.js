import { PDFDocument } from "pdf-lib";

export async function mergePdfBuffers(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const sourcePdf = await PDFDocument.load(file.buffer);

    const pages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );

    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const outputBytes = await mergedPdf.save();

  return Buffer.from(outputBytes);
}