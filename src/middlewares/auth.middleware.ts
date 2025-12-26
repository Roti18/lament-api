import { Context, Next } from 'hono'
import { db } from '../config/db'
import { redis, isRateLimited } from '../services/redis.service'

const MASTER = process.env.MASTER_KEY || ''

const safeCompare = async (a: string, b: string): Promise<boolean> => {
    if (a.length !== b.length) return false
    const ea = new TextEncoder().encode(a)
    const eb = new TextEncoder().encode(b)
    const ka = await crypto.subtle.importKey('raw', ea, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sa = await crypto.subtle.sign('HMAC', ka, ea)
    const kb = await crypto.subtle.importKey('raw', eb, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sb = await crypto.subtle.sign('HMAC', kb, eb)
    const va = new Uint8Array(sa)
    const vb = new Uint8Array(sb)
    let r = 0
    for (let i = 0; i < va.length; i++) r |= va[i] ^ vb[i]
    return r === 0
}

export const authMiddleware = async (c: Context, next: Next) => {
    const key = c.req.header('x-api-key')
    if (!key) return c.json({ error: 'E_AUTH' }, 401)
    if (MASTER && await safeCompare(key, MASTER)) return next()
    const m = c.req.method
    if (m === 'POST' || m === 'PUT' || m === 'DELETE') return c.json({ error: 'E_ACCESS' }, 403)
    try {
        const rs = await db.execute({ sql: 'SELECT id,rate_limit,clearance FROM api_keys WHERE key_hash=? AND is_active=1', args: [key] })
        if (rs.rows.length === 0) return c.json({ error: 'E_AUTH' }, 401)
        const row = rs.rows[0] as unknown as { id: number, rate_limit: number, clearance: number }
        if (redis) {
            if (await isRateLimited(key, row.rate_limit || 100, 60)) return c.json({ error: 'E_LIMIT' }, 429)
        }
        c.set('clearance', row.clearance || 0)
        return next()
    } catch {
        return c.json({ error: 'E_AUTH' }, 500)
    }
}
