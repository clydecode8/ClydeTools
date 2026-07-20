import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 10;

export const uploadFiles = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE,
    fields: 5,
  },
}).array("files", MAX_FILES);

export async function validateUploadedFiles(
  files,
  allowedMimeTypes
) {
  if (!files?.length) {
    const error = new Error("No files were uploaded.");
    error.statusCode = 400;
    throw error;
  }

  const validatedFiles = [];

  for (const file of files) {
    const detectedType = await fileTypeFromBuffer(file.buffer);

    if (!detectedType) {
      const error = new Error(
        `${file.originalname} has an unknown file type.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (!allowedMimeTypes.includes(detectedType.mime)) {
      const error = new Error(
        `${file.originalname} is not an allowed file type.`
      );
      error.statusCode = 400;
      throw error;
    }

    validatedFiles.push({
      ...file,
      detectedMime: detectedType.mime,
      detectedExtension: detectedType.ext,
    });
  }

  return validatedFiles;
}

export function isImage(mimeType) {
  return mimeType?.startsWith("image/");
}

export function isPdf(mimeType) {
  return mimeType === "application/pdf";
}