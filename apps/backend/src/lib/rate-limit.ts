import Redis from "ioredis"

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number }

export interface RateLimitStore {
  hit(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>
}

/** Licznik w Redis (okno stałe): współdzielony między instancjami serwera. */
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async hit(key: string, windowSeconds: number) {
    const results = await this.redis.multi().incr(key).ttl(key).exec()
    const count = Number(results?.[0]?.[1] ?? 0)
    let ttl = Number(results?.[1]?.[1] ?? -1)
    if (ttl < 0) {
      await this.redis.expire(key, windowSeconds)
      ttl = windowSeconds
    }
    return { count, ttl }
  }
}

/** Licznik w pamięci procesu: tylko dla dev/testów bez Redis. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  async hit(key: string, windowSeconds: number) {
    const now = Date.now()
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return { count: 1, ttl: windowSeconds }
    }
    bucket.count += 1
    return { count: bucket.count, ttl: Math.ceil((bucket.resetAt - now) / 1000) }
  }
}

let defaultStore: RateLimitStore | null = null

export function getRateLimitStore(): RateLimitStore {
  if (!defaultStore) {
    // W testach (NODE_ENV=test) licznik w pamięci, jak moduły w medusa-config.
    defaultStore = process.env.REDIS_URL && process.env.NODE_ENV !== "test"
      ? new RedisRateLimitStore(new Redis(process.env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 }))
      : new MemoryRateLimitStore()
  }
  return defaultStore
}

export async function consume(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const { count, ttl } = await store.hit(`patrix:rl:${key}`, windowSeconds)
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds: ttl }
}
