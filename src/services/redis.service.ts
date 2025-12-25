import { Redis } from '@upstash/redis'

const url = typeof process !== 'undefined' ? process.env?.UPSTASH_REDIS_REST_URL : undefined
const token = typeof process !== 'undefined' ? process.env?.UPSTASH_REDIS_REST_TOKEN : undefined

export const redis = (url && token) ? new Redis({ url, token }) : null

export const isRateLimited = async (key: string, limit: number = 100, windowSeconds: number = 60): Promise<boolean> => {
    if (!redis) return false

    const redisKey = `ratelimit:${key}`

    try {
        const current = await redis.get<number>(redisKey) || 0

        if (current >= limit) {
            return true
        }

        const pipeline = redis.pipeline()
        pipeline.incr(redisKey)
        if (current === 0) {
            pipeline.expire(redisKey, windowSeconds)
        }
        await pipeline.exec()

        return false
    } catch (e) {
        console.error('Redis Error:', e)
        return false
    }
}
