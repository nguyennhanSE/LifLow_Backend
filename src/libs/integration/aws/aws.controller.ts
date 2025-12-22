import { Controller, Get, Post, Query } from "@nestjs/common";
import { Body } from "@nestjs/common";
import { AwsService } from "./aws.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "src/libs/decorator";
import { UploadDto } from "./dto/aws.dto";

@Controller('aws')
@ApiTags('AWS')
@ApiBearerAuth()
export class AwsController {
    constructor(private readonly awsService: AwsService) {}

    @Post('upload')
    @Public()
    async upload(@Body() body: UploadDto) {
        return this.awsService.uploadObject({
            key: body.key,
            body: body.body,
            contentType: body.contentType,
            isPublic: body.isPublic,
            cacheControl: body.cacheControl,
        });
    }
    @Get('delete')
    @Public()
    async delete(@Query('key') key: string) {
        return this.awsService.deleteObject(key);
    }
    @Get('get-public-url')
    @Public()
    getPublicUrl(@Query('key') key: string) {
        return this.awsService.getPublicUrl(key);
    }
}