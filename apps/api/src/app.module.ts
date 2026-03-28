import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { PriceModule } from './price/price.module';
import { HorizonModule } from './horizon/horizon.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [CacheModule, PriceModule, HorizonModule, IndexerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
