import { Context, Next } from 'hono'
import { db } from '../config/db'

export const authMiddleware = async (c: Context, next: Next) => {
    // 1. Skip auth for root docs endpoint AND static docs assets
    if ((c.req.path === '/' || c.req.path.startsWith('/docs/')) && c.req.method === 'GET') {
        return await next()
    }

    const apiKey = c.req.header('x-api-key')
    const masterKey = process.env.MASTER_KEY

    if (!apiKey) {
        return c.json({ error: 'Missing API Key' }, 401)
    }

    // 2. CHECK FOR MASTER KEY (Admin Access)
    // Master Key has full access to EVERYTHING
    if (apiKey === masterKey) {
        return await next()
    }

    // 3. IF NOT MASTER KEY, BLOCK UNSAFE METHODS
    // Only Master Key can write (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
        return c.json({ error: 'Write access requires Master Key' }, 403)
    }

    // 4. CHECK USER API KEYS (Read Only Access)
    // Validate key against database
    try {
        const rs = await db.execute({
            sql: 'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1',
            args: [apiKey] // In production, we should hash this BEFORE comparing. For MVP, direct comparison.
        })

        if (rs.rows.length === 0) {
            return c.json({ error: 'Invalid API Key' }, 401)
        }

        const keyData: any = rs.rows[0]
        const limit = Number(keyData.rate_limit) || 100

        // 5. RATE LIMIT CHECK (Redis)
        const { isRateLimited } = await import('../services/redis.service')
        const limited = await isRateLimited(apiKey, limit, 60) // 1 minute window

        if (limited) {
            return c.json({
                error: 'Rate limit exceeded',
                message: `You have reached your limit of ${limit} requests per minute.`
            }, 429)
        }

        return await next()
    } catch (e) {
        console.error('Auth Error:', e)
        return c.json({ error: 'Authentication failed' }, 500)
    }
}
