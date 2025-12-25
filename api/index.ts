import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()

// DEBUG MIDDLEWARE
app.use('*', async (c, next) => {
    console.log('[DEBUG] Request Method:', c.req.method)
    console.log('[DEBUG] Request Path:', c.req.path)
    console.log('[DEBUG] Request URL:', c.req.url)
    console.log('[DEBUG] Raw Path:', c.req.raw.url)
    await next()
})

// CORS
app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

app.get('/', (c) => c.text('Lament API v2.0.6'))
app.get('/test', (c) => c.json({ status: 'ok', version: '2.0.6' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

// Catch All
app.all('*', (c) => {
    console.log('[DEBUG] Fallback Route Hit:', c.req.path)
    return c.json({ error: 'Not Found', path: c.req.path, info: 'Fallback' }, 404)
})

export default handle(app)
