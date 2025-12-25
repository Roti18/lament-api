import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Version Header for Debugging
app.use("*", async (c, next) => {
    await next()
    c.header('X-App-Version', '1.0.3-no-cors')
    c.header('X-Powered-By', 'Lament-API')
})

// 2. Logging
app.use("*", logger())

// 3. Simplified & Safe Headers for Vercel
app.use("*", secureHeaders())

// 5. Auth Bypass for Docs & Options
app.use('*', async (c, next) => {
    if (c.req.path === '/' || c.req.path.startsWith('/docs')) {
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
        return c.text('Lament API is Online')
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

// 7. Business Routes
app.route("/", routes)

app.notFound((c) => c.json({ success: false, error: "Route not found" }, 404))

export default app
