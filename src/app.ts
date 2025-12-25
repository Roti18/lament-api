import { Hono } from "hono"

// ULTRA MINIMAL - TIDAK ADA IMPORT LAIN
const app = new Hono()

// CORS manual
app.use("*", async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
})

// Home
app.get('/', (c) => c.text('Lament API v2.0.3 - Ultra Minimal Mode'))

// Test route
app.get('/test', (c) => c.json({ status: 'ok', version: '2.0.3' }))

// Health
app.get('/health', (c) => c.json({ status: 'ok' }))

// 404
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

export default app
