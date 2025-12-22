import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class UploadDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: 'The key of the object to upload' })
    key: string;

    @IsNotEmpty()
    @ApiProperty({ description: 'The body of the object to upload' })
    body: Buffer | Uint8Array | string;

    @IsString()
    @ApiProperty({ description: 'The content type of the object to upload' })
    contentType?: string;

    @IsBoolean()
    @ApiProperty({ description: 'Whether the object should be public' })
    isPublic?: boolean;

    @IsString()
    @ApiProperty({ description: 'The cache control of the object to upload' })
    cacheControl?: string;
}