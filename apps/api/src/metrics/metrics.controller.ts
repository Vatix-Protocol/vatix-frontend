import {
  Controller,
  Get,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { IndexerMonitorService } from './indexer-monitor.service';

@Controller()
export class MetricsController {
  constructor(private readonly monitor: IndexerMonitorService) {}

  @Get('metrics/indexer')
  async getIndexerMetrics(@Headers('x-api-key') apiKey: string) {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
    return this.monitor.getMetrics();
  }

  @Get('health')
  async getHealth() {
    const metrics = await this.monitor.getMetrics();
    return {
      status: 'ok',
      indexer: {
        status: metrics.status,
        lagLedgers: metrics.lagLedgers,
        lagSeconds: metrics.lagSeconds,
      },
    };
  }
}
