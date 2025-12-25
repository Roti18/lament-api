import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { serveStatic } from "@hono/node-server/serve-static"
import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Logger
app.use("*", logger())

// 2. CORS dari ENV (default: allow all)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['*']

app.use("*", cors({
    origin: (origin) => {
        if (allowedOrigins.includes('*')) return '*'
        if (!origin) return allowedOrigins[0]
        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400,
}))

// 3. Version Header
app.use("*", async (c, next) => {
    await next()
    c.header('X-App-Version', '2.0.0')
})

// 4. Static Docs (for local dev)
app.use('/docs/*', serveStatic({ root: './' }))

// 5. Fallback for /docs/index.html explicit
app.get('/docs/index.html', async (c) => {
    try {
        const html = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
        return c.html(html)
    } catch {
        return c.text('Docs not found', 404)
    }
})

// 6. Docs JSON endpoint
app.get('/docs/docs.json', async (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch {
        return c.json({ error: 'Docs not found' }, 404)
    }
})

// 7. Home
app.get('/', (c) => c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lament API</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-white min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-indigo-400 mb-4">Lament API</h1>
        <p class="text-zinc-400">Music streaming backend service</p>
        <p class="text-zinc-500 mt-2">Version 2.0.0</p>
        <div class="mt-6 space-x-4">
            <a href="/docs/index.html" class="text-indigo-300 hover:underline">API Docs</a>
            <a href="/tracks" class="text-indigo-300 hover:underline">Tracks</a>
        </div>
    </div>
</body>
</html>
`))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 8. Auth Middleware untuk protected routes
app.use('/tracks/*', authMiddleware)
app.use('/artists/*', authMiddleware)
app.use('/albums/*', authMiddleware)
app.use('/categories/*', authMiddleware)
app.use('/users/*', authMiddleware)
app.use('/api-keys/*', authMiddleware)
app.use('/upload/*', authMiddleware)

// 9. API Routes
app.route("/", routes)

// 10. 404 Handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default app
