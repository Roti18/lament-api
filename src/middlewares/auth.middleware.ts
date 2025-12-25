import { Context, Next } from 'hono'
import { db } from '../config/db'

export const authMiddleware = async (c: Context, next: Next) => {
    // 1. Skip auth for root docs endpoint AND static docs assets
    const path = c.req.path
    if ((path === '/' || path.startsWith('/docs/')) && c.req.method === 'GET') {
        return await next()
    }

    // 2. Get API Key from header
    // Using a more manual way to get headers to avoid the TypeError on some Vercel runtimes
    const apiKey = c.req.header('x-api-key') || c.req.header('X-API-KEY')
    const masterKey = process.env.MASTER_KEY

    if (!apiKey) {
        return c.json({ error: 'Missing API Key' }, 401)
    }

    // 3. CHECK FOR MASTER KEY (Admin Access)
    if (apiKey === masterKey) {
        return await next()
    }

    // 4. BLOCK UNSAFE METHODS FOR NON-MASTER KEYS
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
        return c.json({ error: 'Write access requires Master Key' }, 403)
    }

    // 5. CHECK USER API KEYS (Read Only Access)
    try {
        const rs = await db.execute({
            sql: 'SELECT rate_limit FROM api_keys WHERE key_hash = ? AND is_active = 1',
            args: [apiKey]
        })

        if (rs.rows.length === 0) {
            return c.json({ error: 'Invalid API Key' }, 401)
        }

        // TEMPORARILY DISABLE REDIS TO DEBUG TIMEOUT
        /*
        const keyData: any = rs.rows[0]
        const limit = Number(keyData.rate_limit) || 100
        const { isRateLimited } = await import('../services/redis.service')
        const limited = await isRateLimited(apiKey, limit, 60)
        if (limited) {
            return c.json({ error: 'Rate limit exceeded' }, 429)
        }
        */

        return await next()
    } catch (e) {
        console.error('Auth Error:', e)
        return c.json({ error: 'Authentication failed' }, 500)
    }
}
