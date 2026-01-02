import { Hono } from 'hono'
import { corsAndCacheMiddleware, bodySizeMiddleware } from './middlewares/common.middleware'
import edgeRoutes from './routes/edge-routes'

const app = new Hono()

app.use('*', bodySizeMiddleware)
app.use('*', corsAndCacheMiddleware)

app.route('/', edgeRoutes)

app.onError((err, c) => {
    return c.json({
        error: 'E_INTERNAL',
        message: err.message
    }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
