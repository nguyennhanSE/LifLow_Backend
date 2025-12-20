export abstract class IAwsService {
    abstract uploadObject(params: {
        key: string;
        body: Buffer | Uint8Array | string;
        contentType?: string;
        isPublic?: boolean;
        cacheControl?: string;
    }): Promise<{ key: string; url?: string }>;

    abstract deleteObject(key: string): Promise<void>;

    abstract getPublicUrl(key: string): string;
}


