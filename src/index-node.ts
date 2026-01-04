import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from './middlewares/auth.middleware'
import { corsAndCacheMiddleware, bodySizeMiddleware } from './middlewares/common.middleware'
import nodeRoutes from './routes/node-routes'

const app = new Hono()

app.use('*', bodySizeMiddleware)
app.use('*', corsAndCacheMiddleware)

// Add security headers that should apply to all responses
app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups') // Added COOP header
    await next()
})

const protectedPaths = ['/tracks', '/artists', '/albums', '/categories', '/users', '/api-keys', '/upload', '/search', '/lyrics', '/playlists', '/playlist-tracks', '/requests']

// Conditional auth middleware
app.use('*', async (c, next) => {
    const isProtected = protectedPaths.some(p => c.req.path === p || c.req.path.startsWith(`${p}/`))
    if (isProtected) {
        return authMiddleware(c, next)
    }
    await next()
})

app.route('/', nodeRoutes)

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return c.json({
            error: 'E_HTTP',
            message: err.message
        }, err.status)
    }
    return c.json({
        error: 'E_INTERNAL',
        message: err.message
    }, 500)
})

app.notFound(() => new Response(null, { status: 404 }))

export default app
