import { Context, Next } from 'hono'

// Edge-compatible auth middleware
export const authMiddleware = async (c: Context, next: Next) => {
    // Get API Key from header (Edge compatible)
    const apiKey = c.req.header('x-api-key') || c.req.header('X-API-KEY')
    const masterKey = typeof process !== 'undefined' ? process.env?.MASTER_KEY : undefined

    if (!apiKey) {
        return c.json({ error: 'Missing API Key' }, 401)
    }

    // Master Key = Full Access
    if (masterKey && apiKey === masterKey) {
        return await next()
    }

    // Block write operations for non-master keys
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
        return c.json({ error: 'Write access requires Master Key' }, 403)
    }

    // Validate against database
    try {
        const { db } = await import('../config/db')
        const rs = await db.execute({
            sql: 'SELECT id, rate_limit FROM api_keys WHERE key_hash = ? AND is_active = 1',
            args: [apiKey]
        })

        if (rs.rows.length === 0) {
            return c.json({ error: 'Invalid API Key' }, 401)
        }

        // Optional: Rate Limiting with Redis
        try {
            const { isRateLimited } = await import('../services/redis.service')
            const keyData = rs.rows[0] as any
            const limit = Number(keyData.rate_limit) || 100
            const limited = await isRateLimited(apiKey, limit, 60)

            if (limited) {
                return c.json({
                    error: 'Rate limit exceeded',
                    limit: limit,
                    window: '1 minute'
                }, 429)
            }
        } catch {
            // Redis not configured, skip rate limiting
        }

        return await next()
    } catch (e: any) {
        console.error('Auth Error:', e.message)
        return c.json({ error: 'Authentication failed', details: e.message }, 500)
    }
}
