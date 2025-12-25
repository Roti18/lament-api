import { Context, Next } from 'hono'
import { db } from '../config/db'

export const authMiddleware = async (c: Context, next: Next) => {
    // 1. Defensively get API Key (Works for both Edge and Node runtimes)
    const rawReq = c.req.raw as any
    let apiKey: string | null = null

    if (rawReq.headers && typeof rawReq.headers.get === 'function') {
        apiKey = rawReq.headers.get('x-api-key') || rawReq.headers.get('X-API-KEY')
    } else if (rawReq.headers) {
        apiKey = rawReq.headers['x-api-key'] || rawReq.headers['X-API-KEY']
    }

    const masterKey = process.env.MASTER_KEY

    if (!apiKey) {
        return c.json({ error: 'Missing API Key' }, 401)
    }

    // 2. Master Key Bypass
    if (apiKey === masterKey) {
        return await next()
    }

    // 3. Database Check
    try {
        const rs = await db.execute({
            sql: 'SELECT rate_limit FROM api_keys WHERE key_hash = ? AND is_active = 1',
            args: [apiKey]
        })

        if (rs.rows.length === 0) {
            return c.json({ error: 'Invalid API Key' }, 401)
        }

        // Return to normal flow
        return await next()
    } catch (e) {
        console.error('Auth Error:', e)
        return c.json({ error: 'Authentication failed' }, 500)
    }
}
