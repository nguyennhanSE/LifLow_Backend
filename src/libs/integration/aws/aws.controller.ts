import { Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { Body } from "@nestjs/common";
import { AwsService } from "./aws.service";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Public } from "src/libs/decorator";
import { UploadDto } from "./dto/aws.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { File } from "buffer";

@Controller('aws')
@ApiTags('AWS')
@ApiBearerAuth()
export class AwsController {
    constructor(private readonly awsService: AwsService) {}

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: File })
    @UseInterceptors(FileInterceptor('file'))
    @Public()
    async upload(@Body('prefix') prefix: string, @Body('id') id: string, @UploadedFile() file: Express.Multer.File) {
        return this.awsService.uploadFile(prefix, id, file);
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