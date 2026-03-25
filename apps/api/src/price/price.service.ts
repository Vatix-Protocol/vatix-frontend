import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';

export interface PriceEvent {
  poolId: string;
  currentPrice: string;
  sqrtPrice: string;
  change24h: string;
  timestamp: number;
}

@Injectable()
export class PriceService {
  // poolId -> Set of subscribed clients
  private subscriptions = new Map<string, Set<WebSocket>>();
  // client -> Set of subscribed poolIds (for cleanup on disconnect)
  private clientPools = new Map<WebSocket, Set<string>>();

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

  broadcastPrice(event: PriceEvent): void {
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
