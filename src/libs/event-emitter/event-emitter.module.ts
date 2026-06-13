import { Module } from "@nestjs/common";
import { AppEventEmitterService} from "./event-emitter.service";
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [
        EventEmitterModule.forRoot({
            wildcard: true,
            delimiter: '.',
            maxListeners: 10,
            verboseMemoryLeak: true,
        }),
    ],
    providers: [AppEventEmitterService],
    exports: [AppEventEmitterService],
})
export class AppEventEmitterModule {} 