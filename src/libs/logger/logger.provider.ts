import { Logger } from "@nestjs/common";
import { AppLogger } from "./logger.service";


export const LoggerServiceProvider = {
    
    provide: AppLogger,

    
    inject: [],

   
    useFactory: (): AppLogger => {
        const baseLogger = new Logger('LiflowLogger');

        const liflowLoggerInstance = new AppLogger(baseLogger);
    
        return liflowLoggerInstance;
    }
};
