import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"

import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// Paling Minimal: Cek apakah core Hono bisa jalan di Vercel tanpa middleware aneh-aneh
app.use("*", logger())

app.use("*", async (c, next) => {
    await next()
    c.header('X-Debug-Status', 'Minimal-Mode')
})

// Auth Bypass - Pastikan ini tidak crash
app.use('*', async (c, next) => {
    const p = c.req.path
    if (p === '/' || p.startsWith('/docs')) {
        return await next()
    }
    return authMiddleware(c, next)
})

app.get('/', (c) => c.text('Lament API Minimal Mode'))

app.route("/", routes)

export default app
