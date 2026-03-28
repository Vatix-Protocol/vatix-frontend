export type PoolOrderBy = 'tvl' | 'volume' | 'apr';

export interface PoolSnapshot {
  id: string;
  token0: string;
  token1: string;
  feeTier: string;
  tvl: number;
  volume24h: number;
  feeApr: number;
  currentPrice: number;
  active: boolean;
  updatedAt: number;
}

export interface PoolListQuery {
  page: number;
  limit: number;
  orderBy: PoolOrderBy;
  search?: string;
}

export interface PoolListResult {
  items: PoolSnapshot[];
  total: number;
}
