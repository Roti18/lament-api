import { Hono } from "hono"
import { logger } from "hono/logger"
import { authMiddleware } from "./middlewares/auth.middleware"
import routes from "./routes/index"

const app = new Hono()

// 1. Logger
app.use("*", logger())

// 2. Manual CORS (Bypass Hono's cors middleware to avoid TypeError)
app.use("*", async (c, next) => {
    // Set CORS headers manually
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
        return c.text('', 204)
    }

    await next()
})

// 3. Debug Header
app.use("*", async (c, next) => {
    await next()
    c.header('X-App-Version', '1.0.5-manual-cors')
})

// 4. Auth Bypass for public routes
app.use('*', async (c, next) => {
    const p = c.req.path
    if (p === '/' || p === '/docs/docs.json') {
        return await next()
    }
    return authMiddleware(c, next)
})

// 5. Simple Home
app.get('/', (c) => c.html(`
<!DOCTYPE html>
<html>
<head><title>Lament API</title></head>
<body style="font-family:sans-serif; background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh;">
    <div style="text-align:center;">
        <h1 style="color:#6366f1;">Lament API</h1>
        <p>Status: Online</p>
    </div>
</body>
</html>
`))

// 6. Routes
app.route("/", routes)

export default app
