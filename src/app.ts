import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"

import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. SECURITY & LOGGING (Paling Atas)
app.use("*", secureHeaders())
app.use("*", logger())

// 2. CORS (Gunakan yang paling simpel dulu agar tidak crash di Vercel)
app.use("*", cors({
    origin: '*', // Untuk testing prod, biarkan * dulu, nanti bisa kita perketat
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}))

// 3. CLEANUP HEADERS
app.use("*", async (c, next) => {
    await next()
    c.header('X-Powered-By', 'Lament')
})

// 4. AUTH (Hanya untuk /tracks, /artists, dll)
// Kita lewatkan root (/) dan /docs/ agar dokumentasi tetap bisa terbuka
app.use('*', async (c, next) => {
    if (c.req.path === '/' || c.req.path.startsWith('/docs') || c.req.method === 'OPTIONS') {
        return await next()
    }
    return authMiddleware(c, next)
})

// 5. DOCUMENTATION (Manual Serving)
app.get('/', (c) => {
    try {
        const html = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
        return c.html(html)
    } catch (e) {
        return c.text('Lament API is Running')
    }
})

app.get('/docs/docs.json', (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch (e) {
        return c.json({ error: 'Docs not found' }, 404)
    }
})

// 6. BUSINESS ROUTES
app.route("/", routes)

app.notFound((c) => c.json({ success: false, error: "Not Found" }, 404))

export default app
