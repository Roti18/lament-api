import fs from 'node:fs'
import path from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
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
    const requestOrigin = c.req.header('origin') || ''
    let allowOrigin = '*'

    if (ORIGINS) {
        const allowedList = ORIGINS.split(',').map(o => o.trim())
        if (allowedList.includes(requestOrigin)) {
            allowOrigin = requestOrigin
        } else if (allowedList.length === 1) {
            allowOrigin = allowedList[0]
        }
    }

    c.header('Access-Control-Allow-Origin', allowOrigin)
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key')
    c.header('Access-Control-Max-Age', '86400')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Cache-Control', 'no-store')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.use('/docs/*', serveStatic({ root: './' }))

app.get('/docs/docs.json', async (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch {
        return c.json({ error: 'E_NF' }, 404)
    }
})

app.get('/', async (c) => {
    try {
        const html = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
        return c.html(html)
    } catch {
        return c.text('Not found', 404)
    }
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
