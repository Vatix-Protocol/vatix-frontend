import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PoolsController } from './pools.controller';
import { PoolsRepository } from './pools.repository';
import { PoolsService } from './pools.service';

@Module({
  imports: [CacheModule],
  controllers: [PoolsController],
  providers: [PoolsRepository, PoolsService],
  exports: [PoolsService],
})
export class PoolsModule {}
