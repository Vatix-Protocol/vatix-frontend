import { Controller, Get, Query } from '@nestjs/common';
import { GetPoolsQueryDto } from './dto/get-pools-query.dto';
import { PoolsListResponse, PoolsService } from './pools.service';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get()
  getPools(@Query() query: GetPoolsQueryDto): Promise<PoolsListResponse> {
    return this.poolsService.getPools(query);
  }
}
