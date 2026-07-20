import { PDFDocument, degrees } from "pdf-lib";

function downloadBlob(bytes, filename, mimeType = "application/pdf") {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function webpToPngBytes(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Your browser could not create an image canvas.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Unable to convert ${file.name} from WebP.`));
      }, "image/png");
    });

    return pngBlob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function embedImage(pdf, file) {
  if (file.type === "image/png") {
    return pdf.embedPng(await file.arrayBuffer());
  }

  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    return pdf.embedJpg(await file.arrayBuffer());
  }

  if (file.type === "image/webp") {
    return pdf.embedPng(await webpToPngBytes(file));
  }

  throw new Error(`${file.name} is unsupported. Use JPG, PNG, or WebP.`);
}

export async function mergePdfsInBrowser(files) {
  if (!files?.length) {
    throw new Error("Please select at least one PDF.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    if (file.type !== "application/pdf") {
      throw new Error(`${file.name} is not a PDF file.`);
    }

    const sourceBytes = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(sourceBytes);

    const pages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );

    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const outputBytes = await mergedPdf.save();
  downloadBlob(outputBytes, "clydetools-merged.pdf");
}

function safePdfFilename(filename, index) {
  const baseName = filename.replace(/\.[^/.]+$/, "").trim();
  const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "-") || `photo-${index + 1}`;
  return `${safeName}.pdf`;
}

async function createImagePdf(file) {
  const pdf = await PDFDocument.create();
  const image = await embedImage(pdf, file);
  const page = pdf.addPage([image.width, image.height]);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });

  return pdf.save();
}

export async function imagesToPdfInBrowser(files, mergePhotos = true) {
  if (!files?.length) {
    throw new Error("Please select at least one image.");
  }

  if (!mergePhotos) {
    for (let index = 0; index < files.length; index += 1) {
      const outputBytes = await createImagePdf(files[index]);
      downloadBlob(outputBytes, safePdfFilename(files[index].name, index));
    }
    return;
  }

  const pdf = await PDFDocument.create();

  for (const file of files) {
    const image = await embedImage(pdf, file);
    const page = pdf.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const outputBytes = await pdf.save();
  downloadBlob(outputBytes, "clydetools-images.pdf");
}

export async function splitPdfInBrowser(file) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please select a valid PDF.");
  }

  const sourceBytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(sourceBytes);

  for (let index = 0; index < sourcePdf.getPageCount(); index += 1) {
    const outputPdf = await PDFDocument.create();
    const [page] = await outputPdf.copyPages(sourcePdf, [index]);
    outputPdf.addPage(page);

    const outputBytes = await outputPdf.save();
    downloadBlob(outputBytes, `clydetools-page-${index + 1}.pdf`);
  }
}

export async function rotatePdfInBrowser(file, rotation = 90) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please select a valid PDF.");
  }

  const sourceBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(sourceBytes);

  pdf.getPages().forEach((page) => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotation) % 360));
  });

  const outputBytes = await pdf.save();
  downloadBlob(outputBytes, "clydetools-rotated.pdf");
}
