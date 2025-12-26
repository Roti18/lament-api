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
    c.header('Cache-Control', 'no-store')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.get('/', (c) => c.redirect('/docs/index.html'))
app.get('/health', (c) => c.json({ s: 1 }))

const protectedPaths = ['/tracks', '/artists', '/albums', '/categories', '/users', '/api-keys', '/upload']
protectedPaths.forEach(p => { app.use(p, authMiddleware); app.use(`${p}/*`, authMiddleware) })

app.route('/', routes)
app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
