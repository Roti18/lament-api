import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Basic Middleware
app.use("*", logger())
app.use("*", cors())

// 2. Debug Header
app.use("*", async (c, next) => {
    await next()
    c.header('X-Runtime', 'Vercel-Edge')
})

// 3. Simple Auth Bypass
app.use('*', async (c, next) => {
    const p = c.req.path
    if (p === '/' || p === '/docs/docs.json' || c.req.method === 'OPTIONS') {
        return await next()
    }
    return authMiddleware(c, next)
})

// 4. Docs (Hardcoded for Edge Stability)
app.get('/', (c) => c.html(`
<!DOCTYPE html>
<html>
<head><title>Lament API</title></head>
<body style="font-family:sans-serif; background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh;">
    <div style="text-align:center;">
        <h1 style="color:#6366f1;">Lament API</h1>
        <p>Status: Online (Edge Runtime)</p>
        <p><a href="/tracks" style="color:#aaa;">Test API</a></p>
    </div>
</body>
</html>
`))

// 5. App Routes
app.route("/", routes)

export default app
