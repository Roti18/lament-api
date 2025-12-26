import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = (url && token) ? new Redis({ url, token }) : null

export const isRateLimited = async (key: string, limit: number = 100, window: number = 60): Promise<boolean> => {
    if (!redis) return false
    const k = `rl:${key}`
    try {
        const c = await redis.get<number>(k) || 0
        if (c >= limit) return true
        const p = redis.pipeline()
        p.incr(k)
        if (c === 0) p.expire(k, window)
        await p.exec()
        return false
    } catch {
        return false
    }
}

const TTL = {
    LIST: 60,
    ITEM: 120,
    STATS: 300
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
    if (!redis) return null
    try {
        return await redis.get<T>(key)
    } catch {
        return null
    }
}

export const cacheSet = async (key: string, data: unknown, ttl: number = TTL.LIST): Promise<void> => {
    if (!redis) return
    try {
        await redis.set(key, JSON.stringify(data), { ex: ttl })
    } catch { }
}

export const cacheDel = async (pattern: string): Promise<void> => {
    if (!redis) return
    try {
        await redis.del(pattern)
    } catch { }
}
export const invalidateCache = async (entity: 'tracks' | 'artists' | 'albums' | 'categories'): Promise<void> => {
    if (!redis) return
    try {
        await redis.del(`cache:${entity}:list`)
    } catch { }
}

export { TTL }
