import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NodeExporterService } from "./node-exporter.service";

@Module({
    imports: [HttpModule],
    providers: [NodeExporterService],
    exports: [NodeExporterService],
})
export class NodeExporterModule {}