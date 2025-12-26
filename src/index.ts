import { Hono } from 'hono'
import { authMiddleware } from './middlewares/auth.middleware'
import routes from './routes/index'

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
})

app.use('*', async (c, next) => {
    const o = c.req.header('origin') || ''
    const ao = ORIGINS.length === 0 ? '*' : ORIGINS.includes(o) ? o : !o ? ORIGINS[0] : ''
    if (ao) c.header('Access-Control-Allow-Origin', ao)
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key')
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

app.get('/', (c) => c.json({ name: 'lament-api', version: '1.0.0', status: 'ok', docs: '/docs' }))
app.get('/docs', (c) => c.json({
    auth: 'All endpoints require x-api-key header',
    endpoints: {
        tracks: { list: 'GET /tracks', get: 'GET /tracks/:id', create: 'POST /tracks', update: 'PUT /tracks/:id', delete: 'DELETE /tracks/:id' },
        artists: { list: 'GET /artists', get: 'GET /artists/:id', create: 'POST /artists', update: 'PUT /artists/:id', delete: 'DELETE /artists/:id' },
        albums: { list: 'GET /albums', get: 'GET /albums/:id', create: 'POST /albums', update: 'PUT /albums/:id', delete: 'DELETE /albums/:id' },
        categories: { list: 'GET /categories', get: 'GET /categories/:id', create: 'POST /categories' },
        upload: { audio: 'POST /upload (multipart, type=audio)', image: 'POST /upload (multipart, type=image)' }
    }
}))
app.get('/health', (c) => c.json({ s: 1 }))

const protectedPaths = ['/tracks', '/artists', '/albums', '/categories', '/users', '/api-keys', '/upload', '/search']
protectedPaths.forEach(p => { app.use(p, authMiddleware); app.use(`${p}/*`, authMiddleware) })

app.route('/', routes)
app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
