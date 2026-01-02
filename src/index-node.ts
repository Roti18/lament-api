import { Hono } from 'hono'
import { authMiddleware } from './middlewares/auth.middleware'
import { corsAndCacheMiddleware, bodySizeMiddleware } from './middlewares/common.middleware'
import nodeRoutes from './routes/node-routes'

const app = new Hono()

app.use('*', bodySizeMiddleware)
app.use('*', corsAndCacheMiddleware)


const protectedPaths = ['/tracks', '/artists', '/albums', '/categories', '/users', '/api-keys', '/upload', '/search', '/lyrics', '/playlists', '/playlist-tracks', '/requests']
protectedPaths.forEach(p => {
    app.use(p, authMiddleware)
    app.use(`${p}/*`, authMiddleware)
})

app.route('/', nodeRoutes)

app.onError((err, c) => {
    return c.json({
        error: 'E_INTERNAL',
        message: err.message
    }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
