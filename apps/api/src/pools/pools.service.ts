import { Injectable } from '@nestjs/common';
import { CacheService, TTL } from '../cache/cache.service';
import { GetPoolsQueryDto } from './dto/get-pools-query.dto';
import { PoolListQuery, PoolOrderBy, PoolSnapshot } from './pool.types';
import { PoolsRepository } from './pools.repository';

interface PoolsListResponse {
  items: Array<{
    id: string;
    token0: string;
    token1: string;
    feeTier: string;
    tvl: number;
    volume24h: number;
    feeApr: number;
    currentPrice: number;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  orderBy: PoolOrderBy;
  search?: string;
}

@Injectable()
export class PoolsService {
  constructor(
    private readonly cache: CacheService,
    private readonly poolsRepository: PoolsRepository,
  ) {}

  async getPools(query: GetPoolsQueryDto): Promise<PoolsListResponse> {
    const normalized: PoolListQuery = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      orderBy: query.orderBy ?? 'tvl',
      search: query.search?.trim() || undefined,
    };

    const cacheKey = this.getListCacheKey(normalized);
    const cached = await this.cache.get<PoolsListResponse>(cacheKey);
    if (cached) return cached;

    const { items, total } = await this.poolsRepository.listActivePools(normalized);
    const response: PoolsListResponse = {
      items: items.map((pool) => this.toResponsePool(pool)),
      page: normalized.page,
      limit: normalized.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / normalized.limit),
      orderBy: normalized.orderBy,
      search: normalized.search,
    };

    await this.cache.set(cacheKey, response, TTL.POOL_LIST);
    return response;
  }

  async handlePoolStateUpdate(
    poolId: string,
    patch: { currentPrice?: string },
  ): Promise<void> {
    await this.poolsRepository.upsertPoolState(poolId, patch);
    await this.invalidateListCache();
  }

  private async invalidateListCache(): Promise<void> {
    await this.cache.invalidatePattern('pools:list:*');
  }

  private getListCacheKey(query: PoolListQuery): string {
    return [
      'pools:list:v1',
      `page=${query.page}`,
      `limit=${query.limit}`,
      `orderBy=${query.orderBy}`,
      `search=${query.search ?? ''}`,
    ].join(':');
  }

  private toResponsePool(pool: PoolSnapshot): PoolsListResponse['items'][number] {
    return {
      id: pool.id,
      token0: pool.token0,
      token1: pool.token1,
      feeTier: pool.feeTier,
      tvl: pool.tvl,
      volume24h: pool.volume24h,
      feeApr: pool.feeApr,
      currentPrice: pool.currentPrice,
    };
  }
}

export type { PoolsListResponse };
