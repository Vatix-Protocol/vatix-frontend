import { Controller, Get, Query } from '@nestjs/common';
import { GetPoolsQueryDto } from './dto/get-pools-query.dto';
import { GetPoolsResponse, PoolsService } from './pools.service';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get()
  async getPools(@Query() query: GetPoolsQueryDto): Promise<GetPoolsResponse> {
    return this.poolsService.getPools(query);
  }
}
