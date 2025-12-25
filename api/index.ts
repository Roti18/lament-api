import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

// CORS
app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.get('/', (c) => c.text('Lament API v2.0.4'))
app.get('/test', (c) => c.json({ status: 'ok', version: '2.0.4' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

export default handle(app)
