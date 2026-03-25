import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { PriceModule } from './price/price.module';

@Module({
  imports: [CacheModule, PriceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
