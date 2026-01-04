import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import edgeRoutes from './routes/edge-routes'

// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }

const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
const MAX_BODY = 5242880

const app = new Hono()

// Global Body Limit + Encoding Fix
app.use('*', async (c, next) => {
    const m = c.req.method
    if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
        if (+(c.req.header('content-length') || 0) > MAX_BODY) return c.json({ error: 'E_SIZE' }, 413)
    }
    await next()
})

// Official CORS Middleware (Stable for Edge)
app.use('*', cors({
    origin: (origin) => {
        if (!origin) return '*'
        if (ORIGINS.length === 0) return origin
        return ORIGINS.includes(origin) ? origin : (ORIGINS[0] || origin)
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400,
    credentials: true,
}))

// Cache Headers
app.use('*', async (c, next) => {
    if (c.req.method === 'GET') {
        c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    } else {
        c.header('Cache-Control', 'no-store')
    }
    await next()
})

app.route('/', edgeRoutes)

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return c.json({ error: 'E_HTTP', message: err.message }, err.status)
    }
    return c.json({ error: 'E_INTERNAL', message: err.message }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
