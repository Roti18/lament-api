import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"
import { serveStatic } from "@hono/node-server/serve-static"

import { authMiddleware } from "./middlewares/auth.middleware"
import { securityHardening } from "./middlewares/security.middleware"
import routes from "./routes/index"

const app = new Hono()

// Global Middlewares
app.use("*", secureHeaders())
app.use("*", async (c, next) => {
    await next()
    c.header('X-Powered-By', 'Lament') // Set instead of delete
})

// Simplified CORS
app.use("*", cors())

app.use("*", logger())

// ... rest of the middleware ...

app.use('*', authMiddleware)

// Cache Control
app.use('*', async (c, next) => {
    await next()
    if (c.req.method === 'GET' && c.res.status === 200) {
        c.header('Cache-Control', 'public, max-age=60, s-maxage=300')
    }
})

// Documentation (Root)
app.get('/', (c) => {
    try {
        const htmlDocs = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
        return c.html(htmlDocs)
    } catch (e) {
        return c.text('Docs not found', 404)
    }
})

// Serve docs.json manually (Vercel friendly)
app.get("/docs/docs.json", (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch (e) {
        return c.json({ error: 'Docs not found' }, 404)
    }
})

// Routes
app.route("/", routes)

app.notFound((c) =>
    c.json({ success: false, error: { message: "Not Found" } }, 404),
)

export default app
