import { Context, Next } from 'hono'

const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
const MAX_BODY = 5242880

export const bodySizeMiddleware = async (c: Context, next: Next) => {
    const m = c.req.method
    if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
        const ct = c.req.header('content-type') || ''
        if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) return c.json({ error: 'E_CT' }, 415)
        if (+(c.req.header('content-length') || 0) > MAX_BODY) return c.json({ error: 'E_SIZE' }, 413)
    }
    await next()
}

export const corsAndCacheMiddleware = async (c: Context, next: Next) => {
    const o = c.req.header('origin') || ''
    let ao = ''
    if (ORIGINS.length === 0) {
        ao = o || '*'
    } else {
        ao = ORIGINS.includes(o) ? o : ''
    }

    if (ao && ao !== '*') {
        c.header('Access-Control-Allow-Origin', ao)
        c.header('Access-Control-Allow-Credentials', 'true')
    } else {
        c.header('Access-Control-Allow-Origin', '*')
    }

    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key,Authorization')
    c.header('Access-Control-Max-Age', '86400')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')

    if (c.req.method === 'GET') {
        c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    } else {
        c.header('Cache-Control', 'no-store')
    }

    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
}
