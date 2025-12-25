import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"

import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Logger
app.use("*", logger())

// 2. Security Headers (Hono standard)
app.use("*", secureHeaders())

// 3. CORS (Simplified)
app.use("*", cors())

// 4. Custom App Version Header (Run after processing)
app.use("*", async (c, next) => {
    await next()
    c.header('X-App-Version', '1.0.4-stable')
    c.header('X-Powered-By', 'Lament-Backend')
})

// 5. Auth Middleware
// Standard bypass for docs and home
app.use('*', async (c, next) => {
    const p = c.req.path
    if (p === '/' || p.startsWith('/docs') || c.req.method === 'OPTIONS') {
        return await next()
    }
    return authMiddleware(c, next)
})

// 6. Documentation
app.get('/', (c) => {
    try {
        const filePath = path.join(process.cwd(), 'docs', 'index.html')
        const html = fs.readFileSync(filePath, 'utf-8')
        return c.html(html)
    } catch (e) {
        return c.html('<h1>Lament API</h1><p>Online</p>')
    }
})

app.get('/docs/docs.json', (c) => {
    try {
        const filePath = path.join(process.cwd(), 'docs', 'docs.json')
        const json = fs.readFileSync(filePath, 'utf-8')
        return c.json(JSON.parse(json))
    } catch (e) {
        return c.json({ error: 'Docs not found' }, 404)
    }
})

// 7. Core API Routes
app.route("/", routes)

// Fallback
app.notFound((c) => c.json({ success: false, error: "Route not found" }, 404))

export default app
