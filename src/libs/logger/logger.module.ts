import { Module } from '@nestjs/common';
import { LoggerServiceProvider } from './logger.provider';
import { AppLogger } from './logger.service';

@Module({
  providers: [LoggerServiceProvider],
  // Export the AppLogger token so other modules can inject it
  exports: [AppLogger],
})
export class LoggerModule {}
