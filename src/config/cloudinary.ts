import { v2 as cloudinary } from 'cloudinary';
import { config } from '../libs/config';
import { Logger } from '@nestjs/common';

// Initialize logger
const logger = new Logger('CloudinaryConfig');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// Verify configuration
if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
  logger.warn(
    'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
  );
}

/**
 * Upload file to Cloudinary
 * @param file - The file buffer to upload
 * @param folder - The folder path in Cloudinary
 * @returns Promise with the upload result containing the URL
 */
export async function uploadToCloudinary(
  file: Express.Multer.File,
  folder: string = 'products',
): Promise<{ url: string; publicId: string }> {
  try {
    logger.log(
      `Uploading file to Cloudinary folder: ${folder} - originalName: ${file.originalname}, mimeType: ${file.mimetype}, size: ${file.size}`
    );

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            logger.error(
              `Cloudinary upload failed - error: ${error.message}, folder: ${folder}, fileName: ${file.originalname}`
            );
            return reject(new Error(error.message || 'Cloudinary upload failed'));
          }

          if (!result) {
            const noResultError = new Error('Cloudinary upload returned no result');
            logger.error(
              `Cloudinary upload failed: no result - folder: ${folder}, fileName: ${file.originalname}`
            );
            return reject(noResultError);
          }

          logger.log(
            `File uploaded successfully to Cloudinary - url: ${result.secure_url}, publicId: ${result.public_id}, folder: ${folder}`
          );

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      // Pipe the file buffer to the upload stream
      uploadStream.end(file.buffer);
    });
  } catch (error) {
    logger.error(
      `Error in uploadToCloudinary - error: ${error instanceof Error ? error.message : 'Unknown error'}, folder: ${folder}, fileName: ${file.originalname}`
    );
    throw error;
  }
}

export default cloudinary;

