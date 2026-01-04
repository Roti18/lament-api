import { Hono } from 'hono'
import { cors } from 'hono/cors'
import edgeRoutes from './routes/edge-routes'

// Cleanest possible Edge Entry Point
const app = new Hono()

// CORS is critical, minimal config
app.use('*', cors({
    origin: (origin) => origin, // Allow all origins explicitly for debugging
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
}))

// Mount Edge Routes
app.route('/', edgeRoutes)

// Simple Error Handler
app.onError((err, c) => {
    return c.json({ error: 'E_INTERNAL', message: err.message }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
export { app }
