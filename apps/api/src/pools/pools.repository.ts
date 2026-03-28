import { Injectable } from '@nestjs/common';

export interface PoolRecord {
  id: string;
  token0: string;
  token1: string;
  feeTier: number;
  tvl: string;
  volume24h: string;
  feeApr: string;
  currentPrice: string;
  active: boolean;
}

@Injectable()
export class PoolsRepository {
  async findActivePools(): Promise<PoolRecord[]> {
    // TODO: replace with Prisma query once schema/models are available.
    return [];
  }
}
