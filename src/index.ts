import fs from 'node:fs'
import path from 'node:path'
import { Hono } from "hono"
import { logger } from "hono/logger"
import { serveStatic } from "@hono/node-server/serve-static"
// import { handle } from 'hono/vercel' // Removed: Not needed for zero-config
import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Logger
app.use("*", logger())

// 2. MANUAL CORS check
app.use("*", async (c, next) => {
    const origin = process.env.ALLOWED_ORIGINS || '*'

    c.header('Access-Control-Allow-Origin', origin.includes(',') ? '*' : origin)
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    c.header('Access-Control-Max-Age', '86400')

    if (c.req.method === 'OPTIONS') {
        return c.body(null, 204)
    }

    await next()
})

// 3. Version Header
app.use("*", async (c, next) => {
    await next()
    c.header('X-App-Version', '2.2.0')
})

// 4. Static Docs
app.use('/docs/*', serveStatic({ root: './' }))

app.get('/docs/index.html', async (c) => {
    try {
        const html = fs.readFileSync(path.join(process.cwd(), 'docs', 'index.html'), 'utf-8')
        return c.html(html)
    } catch {
        return c.text('Docs not found', 404)
    }
})

app.get('/docs/docs.json', async (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch {
        return c.json({ error: 'Docs not found' }, 404)
    }
})

// 5. Home
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
        <p class="text-zinc-400">Music streaming backend service (Zero Config)</p>
        <p class="text-zinc-500 mt-2">Version 2.2.0</p>
        <div class="mt-6 space-x-4">
            <a href="/docs/index.html" class="text-indigo-300 hover:underline">API Docs</a>
            <a href="/health" class="text-indigo-300 hover:underline">Health</a>
        </div>
    </div>
</body>
</html>
`))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 6. Routes Configuration
app.route("/", routes)

app.use('/tracks', authMiddleware)
app.use('/tracks/*', authMiddleware)
app.use('/artists', authMiddleware)
app.use('/artists/*', authMiddleware)
app.use('/albums', authMiddleware)
app.use('/albums/*', authMiddleware)
app.use('/categories', authMiddleware)
app.use('/categories/*', authMiddleware)
app.use('/users', authMiddleware)
app.use('/users/*', authMiddleware)
app.use('/api-keys', authMiddleware)
app.use('/api-keys/*', authMiddleware)
app.use('/upload', authMiddleware)
app.use('/upload/*', authMiddleware)

// 7. 404
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

// 8. EXPORT DEFAULT (Vital for Vercel Zero Config)
// Vercel detects the Hono app instance automatically
export default app

// Export app instance (named export) for local dev (src/server.ts)
export { app }
