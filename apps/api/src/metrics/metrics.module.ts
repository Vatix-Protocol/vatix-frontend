import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { IndexerMonitorService } from './indexer-monitor.service';

@Module({
  controllers: [MetricsController],
  providers: [IndexerMonitorService],
})
export class MetricsModule {}
