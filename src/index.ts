import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middlewares/auth.middleware'
import { cacheHeaders } from './middlewares/cache.middleware'
import edgeRoutes from './routes/edge-routes'

const app = new Hono()

app.use('*', cacheHeaders)

app.use('*', cors({
    origin: (origin) => origin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
}))

// Protect everything except internal health checks
app.use('*', async (c, next) => {
    const path = c.req.path
    if (path === '/' || path === '/health' || path === '/ping') {
        return next()
    }
    return authMiddleware(c, next)
})

app.route('/', edgeRoutes)

app.onError((err, c) => {
    return c.json({ error: 'E_INTERNAL', message: err.message }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
