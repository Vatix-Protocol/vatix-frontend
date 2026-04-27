import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { PriceModule } from './price/price.module';
import { HorizonModule } from './horizon/horizon.module';
import { PoolsModule } from './pools/pools.module';
import { PositionsModule } from './positions/positions.module';
import { SwapsModule } from './swaps/swaps.module';
import { IndexerModule } from './indexer/indexer.module';
import { TokensModule } from './tokens/tokens.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    CacheModule,
    PriceModule,
    PoolsModule,
    PositionsModule,
    SwapsModule,
    HorizonModule,
    IndexerModule,
    TokensModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
