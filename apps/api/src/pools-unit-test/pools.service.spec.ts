import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoolsService } from '../../src/pools/pools.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import {
  createMockPrismaService,
  createMockRedisService,
  mockPool,
  paginatedResponse,
} from '../test-utils/mock-factories';

describe('PoolsService', () => {
  let service: PoolsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    const pools = [
      mockPool({ id: 'pool_1' }),
      mockPool({ id: 'pool_2', fee: 500 }),
      mockPool({ id: 'pool_3', fee: 10000 }),
    ];

    it('returns paginated pools on cache miss', async () => {
      redis.get.mockResolvedValue(null); // cache miss
      prisma.pool.count.mockResolvedValue(3);
      prisma.pool.findMany.mockResolvedValue(pools);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResponse(pools, 3, 1, 10));
      expect(prisma.pool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('returns cached result and skips DB calls on cache hit', async () => {
      const cached = paginatedResponse(pools, 3, 1, 10);
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cached);
      expect(prisma.pool.findMany).not.toHaveBeenCalled();
      expect(prisma.pool.count).not.toHaveBeenCalled();
    });

    it('calculates correct skip value for page > 1', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(25);
      prisma.pool.findMany.mockResolvedValue(pools.slice(0, 5));

      await service.findAll({ page: 3, limit: 5 });

      expect(prisma.pool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('returns empty items array when no pools exist', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(0);
      prisma.pool.findMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('uses default pagination values when none provided', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(0);
      prisma.pool.findMany.mockResolvedValue([]);

      await service.findAll({});

      expect(prisma.pool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: expect.any(Number) }),
      );
    });

    it('stores correct cache key format', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(1);
      prisma.pool.findMany.mockResolvedValue([mockPool()]);

      await service.findAll({ page: 2, limit: 5 });

      expect(redis.get).toHaveBeenCalledWith(expect.stringContaining('pools'));
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('pools'),
        expect.any(String),
        expect.any(Number),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the pool on cache miss and populates cache', async () => {
      const pool = mockPool({ id: 'pool_1' });
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockResolvedValue(pool);

      const result = await service.findOne('pool_1');

      expect(result).toEqual(pool);
      expect(prisma.pool.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pool_1' } }),
      );
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('returns cached pool without hitting DB', async () => {
      const pool = mockPool({ id: 'pool_1' });
      redis.get.mockResolvedValue(JSON.stringify(pool));

      const result = await service.findOne('pool_1');

      expect(result).toEqual(pool);
      expect(prisma.pool.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown pool id', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown_pool')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException with descriptive message', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ghost_pool')).rejects.toThrow(
        /ghost_pool/i,
      );
    });

    it('does NOT cache on 404 — no redis.set call', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('queries by address when input looks like an Ethereum address', async () => {
      const pool = mockPool({ address: '0xPoolAddress1' });
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockResolvedValue(pool);

      const result = await service.findOne('0xPoolAddress1');

      expect(result).toEqual(pool);
    });
  });

  // ─── Cache TTL / invalidation ─────────────────────────────────────────────

  describe('cache behaviour', () => {
    it('sets a positive TTL when caching pool list', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(1);
      prisma.pool.findMany.mockResolvedValue([mockPool()]);

      await service.findAll({ page: 1, limit: 10 });

      const [, , ttl] = (redis.set as jest.Mock).mock.calls[0];
      expect(ttl).toBeGreaterThan(0);
    });

    it('serialises result to JSON string in cache', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockResolvedValue(1);
      prisma.pool.findMany.mockResolvedValue([mockPool()]);

      await service.findAll({ page: 1, limit: 10 });

      const [, cachedValue] = (redis.set as jest.Mock).mock.calls[0];
      expect(() => JSON.parse(cachedValue as string)).not.toThrow();
    });
  });

  // ─── Error propagation ────────────────────────────────────────────────────

  describe('error propagation', () => {
    it('bubbles Prisma errors from findAll', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.count.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        'DB connection lost',
      );
    });

    it('bubbles Prisma errors from findOne', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pool.findUnique.mockRejectedValue(new Error('Query timeout'));

      await expect(service.findOne('pool_1')).rejects.toThrow('Query timeout');
    });
  });
});
