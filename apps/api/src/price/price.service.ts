import { Injectable, NotFoundException } from '@nestjs/common';
import { WebSocket } from 'ws';
import { CacheService, TTL } from '../cache/cache.service';

export interface PriceEvent {
  poolId: string;
  currentPrice: string;
  sqrtPrice: string;
  change24h: string;
  timestamp: number;
}

export interface SpotPriceResponse {
  tokenA: string;
  tokenB: string;
  spotPrice: string;
  change24hAbsolute: string;
  change24hPercent: string;
  high24h: string;
  low24h: string;
  lastUpdated: string;
}

export function normalizePair(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase()
    ? [a.toLowerCase(), b.toLowerCase()]
    : [b.toLowerCase(), a.toLowerCase()];
}

export function spotPriceCacheKey(tokenA: string, tokenB: string): string {
  const [a, b] = normalizePair(tokenA, tokenB);
  return `price:spot:${a}:${b}`;
}

@Injectable()
export class PriceService {
  private subscriptions = new Map<string, Set<WebSocket>>();
  private clientPools = new Map<WebSocket, Set<string>>();

  constructor(private readonly cache: CacheService) {}

  subscribe(client: WebSocket, poolId: string): void {
    if (!this.subscriptions.has(poolId)) {
      this.subscriptions.set(poolId, new Set());
    }
    this.subscriptions.get(poolId)!.add(client);

    if (!this.clientPools.has(client)) {
      this.clientPools.set(client, new Set());
    }
    this.clientPools.get(client)!.add(poolId);
  }

  unsubscribe(client: WebSocket, poolId: string): void {
    this.subscriptions.get(poolId)?.delete(client);
    this.clientPools.get(client)?.delete(poolId);
  }

  removeClient(client: WebSocket): void {
    const pools = this.clientPools.get(client);
    if (pools) {
      for (const poolId of pools) {
        this.subscriptions.get(poolId)?.delete(client);
      }
      this.clientPools.delete(client);
    }
  }

  async getSpotPrice(poolId: string): Promise<PriceEvent | null> {
    const key = `price:spot:${poolId}`;
    const cached = await this.cache.get<PriceEvent>(key);
    if (cached) return cached;
    return null;
  }

  async getTokenPairPrice(
    tokenA: string,
    tokenB: string,
  ): Promise<SpotPriceResponse> {
    const key = spotPriceCacheKey(tokenA, tokenB);
    const cached = await this.cache.get<SpotPriceResponse>(key);
    if (cached) return cached;

    const event = await this.getSpotPrice(key);
    if (!event) {
      throw new NotFoundException(
        `No pool found for token pair ${tokenA}/${tokenB}`,
      );
    }

    const price = parseFloat(event.currentPrice);
    const change = parseFloat(event.change24h);
    const changePercent =
      price - change !== 0 ? (change / Math.abs(price - change)) * 100 : 0;

    const response: SpotPriceResponse = {
      tokenA: tokenA.toLowerCase(),
      tokenB: tokenB.toLowerCase(),
      spotPrice: event.currentPrice,
      change24hAbsolute: event.change24h,
      change24hPercent: changePercent.toFixed(4),
      high24h: event.currentPrice,
      low24h: event.currentPrice,
      lastUpdated: new Date(event.timestamp).toISOString(),
    };

    await this.cache.set(key, response, TTL.SPOT_PRICE);
    return response;
  }

  broadcastPrice(event: PriceEvent): void {
    const key = `price:spot:${event.poolId}`;
    void this.cache.set(key, event, TTL.SPOT_PRICE);

    const clients = this.subscriptions.get(event.poolId);
    if (!clients?.size) return;

    const payload = JSON.stringify({ event: 'price', data: event });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  async invalidatePairCache(tokenA: string, tokenB: string): Promise<void> {
    const key = spotPriceCacheKey(tokenA, tokenB);
    await this.cache.invalidate(key);
  }
}
