import { Injectable } from '@nestjs/common';
import { PoolListQuery, PoolListResult, PoolSnapshot } from './pool.types';

type PoolStatePatch = {
  currentPrice?: string;
};

@Injectable()
export class PoolsRepository {
  private readonly pools = new Map<string, PoolSnapshot>();

  async listActivePools(query: PoolListQuery): Promise<PoolListResult> {
    const search = query.search?.trim().toLowerCase();

    const filtered = [...this.pools.values()]
      .filter((pool) => pool.active)
      .filter((pool) => {
        if (!search) return true;
        return (
          pool.token0.toLowerCase().includes(search) ||
          pool.token1.toLowerCase().includes(search)
        );
      });

    const sorted = filtered.sort((a, b) => {
      if (query.orderBy === 'volume') return b.volume24h - a.volume24h;
      if (query.orderBy === 'apr') return b.feeApr - a.feeApr;
      return b.tvl - a.tvl;
    });

    const offset = (query.page - 1) * query.limit;
    const items = sorted.slice(offset, offset + query.limit);

    return {
      items,
      total: sorted.length,
    };
  }

  async upsertPoolState(poolId: string, patch: PoolStatePatch): Promise<void> {
    const existing = this.pools.get(poolId);
    if (!existing) return;

    const currentPrice = patch.currentPrice
      ? Number.parseFloat(patch.currentPrice)
      : existing.currentPrice;

    this.pools.set(poolId, {
      ...existing,
      currentPrice,
      updatedAt: Date.now(),
    });
  }
}
