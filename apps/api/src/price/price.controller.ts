import { Controller, Get, Param } from '@nestjs/common';
import { PriceService, SpotPriceResponse } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get(':tokenA/:tokenB')
  getPrice(
    @Param('tokenA') tokenA: string,
    @Param('tokenB') tokenB: string,
  ): Promise<SpotPriceResponse> {
    return this.priceService.getTokenPairPrice(tokenA, tokenB);
  }
}
