import { Module } from "@nestjs/common";
import { AwsService } from './aws.service';
import { S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { config } from '../../config';
import { IAwsService } from './aws.interface';
import { Logger } from "@nestjs/common";
import { LoggerModule } from "src/libs/logger/logger.module";

const logger = new Logger(AwsService.name);

const s3ClientProvider = {
    provide: S3Client,
    useFactory: () => {
        const region = config.AWS_REGION || 'ap-northeast-2';
        const accessKeyId = config.AWS_ACCESS_KEY_ID;
        const secretAccessKey = config.AWS_SECRET_ACCESS_KEY;
        logger.debug('AWS_REGION: %s, AWS_ACCESS_KEY_ID: %s, AWS_SECRET_ACCESS_KEY: %s', region, accessKeyId, secretAccessKey);

        const credentials = (accessKeyId && secretAccessKey)
            ? { accessKeyId, secretAccessKey }
            : defaultProvider();

        return new S3Client({ region, credentials });
    },
};

@Module({
    imports: [LoggerModule],
    controllers: [],
    providers: [s3ClientProvider, { provide: IAwsService, useClass: AwsService }, AwsService],
    exports: [IAwsService, AwsService, S3Client],
})
export class AwsModule { }