import { Context, Next } from 'hono'
import { db } from '../config/db'
import { redis, isRateLimited } from '../services/redis.service'
import { timingSafeEqual } from 'node:crypto'

const MASTER = process.env.MASTER_KEY || ''
const MASTER_BUF = Buffer.from(MASTER)

const safeCompare = (a: string, b: string): boolean => {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
}

export const authMiddleware = async (c: Context, next: Next) => {
    const key = c.req.header('x-api-key')
    if (!key) return c.json({ error: 'E_AUTH' }, 401)

    if (MASTER && safeCompare(key, MASTER)) return next()

    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) return c.json({ error: 'E_ACCESS' }, 403)

    try {
        const rs = await db.execute({ sql: 'SELECT id,rate_limit,clearance FROM api_keys WHERE key_hash=? AND is_active=1', args: [key] })
        if (rs.rows.length === 0) return c.json({ error: 'E_AUTH' }, 401)

        const row = rs.rows[0] as { id: number, rate_limit: number, clearance: number }

        if (redis) {
            const limited = await isRateLimited(key, row.rate_limit || 100, 60)
            if (limited) return c.json({ error: 'E_LIMIT' }, 429)
        }

        c.set('clearance', row.clearance || 0)
        return next()
    } catch {
        return c.json({ error: 'E_AUTH' }, 500)
    }
}
