import { Injectable } from '@nestjs/common';
import { CacheService, TTL } from '../cache/cache.service';
import { GetPoolsQueryDto, PoolOrderBy } from './dto/get-pools-query.dto';
import { PoolRecord, PoolsRepository } from './pools.repository';

interface PoolListItem {
  id: string;
  token0: string;
  token1: string;
  feeTier: number;
  tvl: string;
  volume24h: string;
  feeApr: string;
  currentPrice: string;
}

interface PoolsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetPoolsResponse {
  data: PoolListItem[];
  pagination: PoolsPagination;
}

@Injectable()
export class PoolsService {
  constructor(
    private readonly cache: CacheService,
    private readonly poolsRepository: PoolsRepository,
  ) {}

  async getPools(query: GetPoolsQueryDto): Promise<GetPoolsResponse> {
    const normalized = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      orderBy: query.orderBy ?? PoolOrderBy.TVL,
      search: (query.search ?? '').toUpperCase(),
    };

    const cacheKey = this.buildListKey(normalized);
    const cached = await this.cache.get<GetPoolsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const allActivePools = await this.poolsRepository.findActivePools();
    const searchedPools = this.applySearch(allActivePools, normalized.search);
    const sortedPools = this.applySort(searchedPools, normalized.orderBy);

    const total = sortedPools.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / normalized.limit);
    const start = (normalized.page - 1) * normalized.limit;
    const pageItems = sortedPools
      .slice(start, start + normalized.limit)
      .map((pool) => this.toListItem(pool));

    const response: GetPoolsResponse = {
      data: pageItems,
      pagination: {
        page: normalized.page,
        limit: normalized.limit,
        total,
        totalPages,
      },
    };

    await this.cache.set(cacheKey, response, TTL.POOL_LIST);
    return response;
  }

  async invalidatePoolListCache(): Promise<void> {
    await this.cache.invalidatePattern('pool:list:*');
  }

  async handlePoolStateUpdate(_poolId: string): Promise<void> {
    await this.invalidatePoolListCache();
  }

  private buildListKey(query: {
    page: number;
    limit: number;
    orderBy: PoolOrderBy;
    search: string;
  }): string {
    return `pool:list:v1:page=${query.page}:limit=${query.limit}:orderBy=${query.orderBy}:search=${query.search}`;
  }

  private applySearch(pools: PoolRecord[], search: string): PoolRecord[] {
    if (!search) return pools;
    return pools.filter(
      (pool) =>
        pool.token0.toUpperCase().includes(search) ||
        pool.token1.toUpperCase().includes(search),
    );
  }

  private applySort(pools: PoolRecord[], orderBy: PoolOrderBy): PoolRecord[] {
    const sorted = [...pools];
    sorted.sort((a, b) => {
      const valueA = this.sortMetric(a, orderBy);
      const valueB = this.sortMetric(b, orderBy);
      return valueB - valueA;
    });
    return sorted;
  }

  private sortMetric(pool: PoolRecord, orderBy: PoolOrderBy): number {
    if (orderBy === PoolOrderBy.VOLUME) {
      return Number(pool.volume24h);
    }
    if (orderBy === PoolOrderBy.APR) {
      return Number(pool.feeApr);
    }
    return Number(pool.tvl);
  }

  private toListItem(pool: PoolRecord): PoolListItem {
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
