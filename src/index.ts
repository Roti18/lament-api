import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from './middlewares/auth.middleware'
import edgeRoutes from './routes/edge-routes'
// import nodeRoutes from './routes/node-routes'

// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }

const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
const MAX_BODY = 5242880

const app = new Hono()

app.use('*', async (c, next) => {
    const m = c.req.method
    if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
        const ct = c.req.header('content-type') || ''
        if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) return c.json({ error: 'E_CT' }, 415)
        if (+(c.req.header('content-length') || 0) > MAX_BODY) return c.json({ error: 'E_SIZE' }, 413)
    }
    await next()
    // Fix for "ERR_CONTENT_DECODING_FAILED" in Vercel Edge
    // Sometimes Vercel double-compresses or conflicts with Hono's headers
    c.res.headers.delete('content-encoding')
})

app.use('*', async (c, next) => {
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

    if (c.req.method === 'GET') {
        c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    } else {
        c.header('Cache-Control', 'no-store')
    }

    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.route('/', edgeRoutes)
// app.route('/', nodeRoutes) // REMOVED: Node routes contain incompatible deps for Edge

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return c.json({
            error: 'E_HTTP',
            message: err.message
        }, err.status)
    }
    return c.json({
        error: 'E_INTERNAL',
        message: err.message
    }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
