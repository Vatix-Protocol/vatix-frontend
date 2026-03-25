import { PriceService, PriceEvent } from './price.service';
import { WebSocket } from 'ws';

function mockClient(readyState = WebSocket.OPEN): WebSocket {
  return { readyState, send: jest.fn() } as unknown as WebSocket;
}

describe('PriceService', () => {
  let service: PriceService;

  beforeEach(() => {
    service = new PriceService();
  });

  const event: PriceEvent = {
    poolId: 'pool-1',
    currentPrice: '1.23',
    sqrtPrice: '1.109',
    change24h: '+2.5',
    timestamp: Date.now(),
  };

  it('broadcasts to subscribed client', () => {
    const client = mockClient();
    service.subscribe(client, 'pool-1');
    service.broadcastPrice(event);
    expect(client.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'price', data: event }),
    );
  });

  it('does not broadcast after unsubscribe', () => {
    const client = mockClient();
    service.subscribe(client, 'pool-1');
    service.unsubscribe(client, 'pool-1');
    service.broadcastPrice(event);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('cleans up all pools on disconnect', () => {
    const client = mockClient();
    service.subscribe(client, 'pool-1');
    service.subscribe(client, 'pool-2');
    service.removeClient(client);
    service.broadcastPrice(event);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('supports multiple clients on same pool', () => {
    const c1 = mockClient();
    const c2 = mockClient();
    service.subscribe(c1, 'pool-1');
    service.subscribe(c2, 'pool-1');
    service.broadcastPrice(event);
    expect(c1.send).toHaveBeenCalledTimes(1);
    expect(c2.send).toHaveBeenCalledTimes(1);
  });

  it('supports one client on multiple pools', () => {
    const client = mockClient();
    service.subscribe(client, 'pool-1');
    service.subscribe(client, 'pool-2');
    service.broadcastPrice(event);
    service.broadcastPrice({ ...event, poolId: 'pool-2' });
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it('skips non-OPEN clients', () => {
    const client = mockClient(WebSocket.CLOSED);
    service.subscribe(client, 'pool-1');
    service.broadcastPrice(event);
    expect(client.send).not.toHaveBeenCalled();
  });
});
