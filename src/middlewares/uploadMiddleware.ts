import multer from 'multer';
import { Request } from 'express';
import { BadRequestException } from '@nestjs/common';

// Configure multer storage (in-memory)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed image mime types
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed. Received: ${file.mimetype}`,
      ),
    );
  }
};

// Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Specific upload configurations for product images
export const uploadProductImages = upload.fields([
  { name: 'detail', maxCount: 1 },
  { name: 'list', maxCount: 1 },
  { name: 'smallList', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

// Single file upload (for general use)
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Multiple files upload (for general use)
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
  upload.array(fieldName, maxCount);

