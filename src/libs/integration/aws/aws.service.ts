import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { IAwsService } from './aws.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import { AppLogger } from 'src/libs/logger/logger.service';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

@Injectable()
export class AwsService implements IAwsService {
    constructor(
        private readonly s3: S3Client,
        private readonly logger: AppLogger ,
        ) { 
            this.logger = new Logger(AwsService.name) as unknown as AppLogger;
        }

    private get bucket(): string {
        return config.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || '';
    }

    private get region(): string {
        return config.AWS_REGION || process.env.AWS_REGION || 'ap-northeast-2';
    }

    async uploadObject(params: { key: string; body: Buffer | Uint8Array | string; contentType?: string; isPublic?: boolean; cacheControl?: string; }): Promise<{ key: string; url?: string }> {
        const { key, body, contentType, isPublic, cacheControl } = params;
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            // ACL: 'public-read',
            // ACL disabled for buckets with Object Ownership: Bucket owner enforced
            CacheControl: cacheControl,
        });
        await this.s3.send(command);
        return { key, url: isPublic ? this.getPublicUrl(key) : undefined } as { key: string; url: string | undefined };
    }

    async uploadFile(prefix: string, id: string, file: Express.Multer.File) {
        const meta = { file: { originalname: file?.originalname, size: file?.size } };
        this.logger.debug(`upload file start`, meta);
        try {
            if (!file?.buffer) {
                throw new InternalServerErrorException('File is required', { cause: new Error('File is required') });
            }
            const ext = (file.originalname || '').split('.').pop()?.toLowerCase() || 'bin';
            const key = `${prefix}/${id}/${Date.now()}.${ext}`;
            const { url } = await this.uploadObject({
                key,
                body: file.buffer,
                contentType: file.mimetype,
                isPublic: true,
                cacheControl: 'public, max-age=31536000',
            });
            this.logger.debug(`upload file done, prefix: ${prefix}, id: ${id}`);
            this.logger.debug(`url: ${url}`);
            return url;
        } catch (error) {
            this.logger.error(`upload file failed`, { ...meta, error });
            throw error;
        }
    }

    async deleteObject(key: string): Promise<void> {
        const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
        await this.s3.send(command);
    }

    getPublicUrl(key: string): string {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    async listObjects(prefix: string): Promise<string[]> {
        const command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
        });
        
        const response = await this.s3.send(command);
        const keys = (response.Contents || [])
            .map(obj => obj.Key)
            .filter((key): key is string => !!key);
        
        return keys;
    }
    
    async getRandomImageFromFolder(folderPath: string): Promise<string | null> {
        try {
            // Đảm bảo folder path kết thúc bằng / nếu chưa có
            const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
            
            // List tất cả objects trong folder
            const keys = await this.listObjects(prefix);
            
            // Lọc ra các file ảnh (jpg, jpeg, png, webp, gif)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            const imageKeys = keys.filter(key => {
                const lowerKey = key.toLowerCase();
                return imageExtensions.some(ext => lowerKey.endsWith(ext));
            });
            
            if (imageKeys.length === 0) {
                this.logger.warn(`No images found in folder: ${folderPath}`);
                return null;
            }
            
            // Chọn random một ảnh
            const randomIndex = Math.floor(Math.random() * imageKeys.length);
            const randomKey = imageKeys[randomIndex];
            
            // Trả về public URL
            return this.getPublicUrl(randomKey);
        } catch (error) {
            this.logger.error(`Failed to get random image from folder: ${folderPath}`, error);
            throw error;
        }
    }
    
    async getImageByIndex(folderPath: string, index: number): Promise<string | null> {
        try {
            const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
            const keys = await this.listObjects(prefix);
            
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            const imageKeys = keys
                .filter(key => {
                    const lowerKey = key.toLowerCase();
                    return imageExtensions.some(ext => lowerKey.endsWith(ext));
                })
                .sort(); // Sắp xếp để đảm bảo thứ tự nhất quán
            
            if (imageKeys.length === 0) {
                this.logger.warn(`No images found in folder: ${folderPath}`);
                return null;
            }
            
            // Lấy ảnh theo index (0-based)
            const actualIndex = index >= 0 ? index % imageKeys.length : (imageKeys.length + index) % imageKeys.length;
            const selectedKey = imageKeys[actualIndex];
            
            return this.getPublicUrl(selectedKey);
        } catch (error) {
            this.logger.error(`Failed to get image by index from folder: ${folderPath}`, error);
            throw error;
        }
    }

    /**
     * Upload base64 image to S3
     * @param prefix S3 prefix (folder path)
     * @param id User or entity ID
     * @param base64Data Base64 encoded image data (without data URL prefix)
     * @param mimeType Image MIME type (e.g., 'image/png', 'image/jpeg')
     * @returns Public URL of uploaded image
     */
    async uploadBase64Image(
        prefix: string,
        id: string,
        base64Data: string,
        mimeType: string,
    ): Promise<string> {
        try {
            // Convert base64 to buffer
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Determine file extension from MIME type
            const mimeToExt: Record<string, string> = {
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/webp': 'webp',
                'image/svg+xml': 'svg',
            };
            
            const ext = mimeToExt[mimeType] || 'jpg';
            const key = `${prefix}/${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            
            const { url } = await this.uploadObject({
                key,
                body: buffer,
                contentType: mimeType,
                isPublic: true,
                cacheControl: 'public, max-age=31536000',
            });
            
            this.logger.debug(`upload base64 image done, prefix: ${prefix}, id: ${id}`);
            return url || this.getPublicUrl(key);
        } catch (error) {
            this.logger.error(`upload base64 image failed`, { prefix, id, error });
            throw error;
        }
    }
}


