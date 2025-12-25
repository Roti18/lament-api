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
app.use("*", securityHardening)
app.use("*", cors())
app.use("*", logger())

// Auth Middleware (Global check, but logic inside might skip root)
app.use('/api/*', authMiddleware)
// Note: original api/index.ts had strict auth on *, here boilerplate uses /api/*.
// To preserve existing contract which enforced keys on /tracks etc, let's map it correctly.
// User wants strict auth. if we route logic to /api/tracks, then /api/* middleware hits.
// BUT existing frontend calls /tracks directly (not /api/tracks).
// So we must apply middleware to * explicitly OR route everything under /api but handle redirects?
// NO, "No change to API contracts". URL must stay /tracks.
// So we must use app.use('*', authMiddleware) like before.

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
    const htmlDocs = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
    return c.html(htmlDocs)
})

// Serve docs static assets (usually just docs.json)
app.get("/docs/*", serveStatic({ root: "./" }))

// Routes
// Original was root-level /tracks. Boilerplate pushes to /api. 
// "No change to API contracts" means we KEEP root level.
app.route("/", routes)

app.notFound((c) =>
    c.json({ success: false, error: { message: "Not Found" } }, 404),
)

export default app
