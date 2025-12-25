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
