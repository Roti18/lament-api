import { Hono } from 'hono'
import { authMiddleware } from './middlewares/auth.middleware'
import routes from './routes/index'

const ORIGINS = process.env.ALLOWED_ORIGINS || ''
const MAX_BODY = 5 * 1024 * 1024

const app = new Hono()

app.use('*', async (c, next) => {
    const ct = c.req.header('content-type') || ''
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
        if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
            return c.json({ error: 'E_CT' }, 415)
        }
        const cl = parseInt(c.req.header('content-length') || '0', 10)
        if (cl > MAX_BODY) return c.json({ error: 'E_SIZE' }, 413)
    }
    await next()
})

app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', ORIGINS || '*')
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key')
    c.header('Access-Control-Max-Age', '86400')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Cache-Control', 'no-store')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.get('/health', (c) => c.json({ s: 1 }))

app.use('/tracks', authMiddleware)
app.use('/tracks/*', authMiddleware)
app.use('/artists', authMiddleware)
app.use('/artists/*', authMiddleware)
app.use('/albums', authMiddleware)
app.use('/albums/*', authMiddleware)
app.use('/categories', authMiddleware)
app.use('/categories/*', authMiddleware)
app.use('/users', authMiddleware)
app.use('/users/*', authMiddleware)
app.use('/api-keys', authMiddleware)
app.use('/api-keys/*', authMiddleware)
app.use('/upload', authMiddleware)
app.use('/upload/*', authMiddleware)

app.route('/', routes)

app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
