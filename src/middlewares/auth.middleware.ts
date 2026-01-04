import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { db } from '../config/db'
import { CacheService } from '../services/cache.service'

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


    if (m === 'POST' || m === 'PUT' || m === 'DELETE') {
        if (!c.req.header('authorization') && !getCookie(c, 'token')) {
            return c.json({ error: 'E_ACCESS' }, 403)
        }
    }
    try {
        const cacheKey = `apikey:${key}`
        let row = await CacheService.get<{ id: string, rate_limit: number, clearance: number }>(cacheKey)

        if (!row) {
            const rs = await db.execute({ sql: 'SELECT id,rate_limit,clearance FROM api_keys WHERE key_hash=? AND is_active=1', args: [key] })
            if (rs.rows.length === 0) {
                return c.json({ error: 'E_AUTH' }, 401)
            }
            row = rs.rows[0] as unknown as { id: string, rate_limit: number, clearance: number }
            await CacheService.set(cacheKey, row, 300) // Cache for 5 mins
        }

        if (await CacheService.isRateLimited(key, row.rate_limit || 100, 60)) {
            return c.json({ error: 'E_LIMIT' }, 429)
        }
        c.set('clearance', row.clearance || 0)
        return next()
    } catch (err: any) {
        return c.json({ error: 'E_AUTH', message: err.message }, 500)
    }
}
