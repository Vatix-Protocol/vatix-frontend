import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import { CacheService, TTL } from '../cache/cache.service';

export interface PriceEvent {
  poolId: string;
  currentPrice: string;
  sqrtPrice: string;
  change24h: string;
  timestamp: number;
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
    // TODO: fetch from DB/RPC and populate
    return null;
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
}
