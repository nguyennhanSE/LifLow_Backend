import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { IAwsService } from './aws.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import { AppLogger } from 'src/libs/logger/logger.service';

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
}


