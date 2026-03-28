import { Module } from '@nestjs/common';
import { PoolsController } from './pools.controller';
import { PoolsRepository } from './pools.repository';
import { PoolsService } from './pools.service';

@Module({
  controllers: [PoolsController],
  providers: [PoolsService, PoolsRepository],
  exports: [PoolsService],
})
export class PoolsModule {}
