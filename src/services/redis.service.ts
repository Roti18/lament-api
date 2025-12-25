import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = (url && token)
    ? new Redis({ url, token })
    : null

export const isRateLimited = async (key: string, limit: number = 100, windowSeconds: number = 60) => {
    if (!redis) return false

    const redisKey = `ratelimit:${key}`
    try {
        // Fetch with a short timeout (2s) to avoid hanging Vercel task
        const current = await Promise.race([
            redis.get<number>(redisKey),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
        ]) || 0

        if (current >= limit) {
            return true
        }

        const pipeline = redis.pipeline()
        pipeline.incr(redisKey)
        if (current === 0) {
            pipeline.expire(redisKey, windowSeconds)
        }
        // Fire and forget or backgrounding isn't great in Serverless, 
        // but we can at least catch errors on exec
        await pipeline.exec()
    } catch (e) {
        console.error('RateLimit Redis Failure:', e)
        return false // Allow on failure
    }

    return false
}
