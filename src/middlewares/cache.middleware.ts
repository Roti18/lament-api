import { Context, Next } from 'hono'

// Daily rotating seed for deterministic "random" ordering
// Changes at midnight UTC, cacheable across requests
const getDailySeed = (): number => {
    const now = new Date()
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
    return (now.getFullYear() * 1000 + dayOfYear) % 97
}

// Cache-Control configurations per endpoint pattern
// maxAge = browser cache, sMaxAge = CDN cache
const CACHE_CONFIG: Record<string, { maxAge: number; sMaxAge: number; isPublic: boolean }> = {
    // Public read endpoints - aggressive CDN caching
    'GET:/tracks': { maxAge: 60, sMaxAge: 300, isPublic: true },
    'GET:/tracks/:id': { maxAge: 300, sMaxAge: 1800, isPublic: true },
    'GET:/tracks/random': { maxAge: 30, sMaxAge: 60, isPublic: true },
    'GET:/artists': { maxAge: 60, sMaxAge: 300, isPublic: true },
    'GET:/artists/:id': { maxAge: 300, sMaxAge: 1800, isPublic: true },
    'GET:/artists/random': { maxAge: 30, sMaxAge: 60, isPublic: true },
    'GET:/albums': { maxAge: 60, sMaxAge: 300, isPublic: true },
    'GET:/albums/:id': { maxAge: 300, sMaxAge: 1800, isPublic: true },
    'GET:/albums/random': { maxAge: 30, sMaxAge: 60, isPublic: true },
    'GET:/categories': { maxAge: 300, sMaxAge: 1800, isPublic: true },
    'GET:/playlists/:id': { maxAge: 60, sMaxAge: 300, isPublic: true },
    // Search - short cache due to query variations
    'GET:/search': { maxAge: 30, sMaxAge: 60, isPublic: true },
    // Lyrics - stable content
    'GET:/tracks/:id/lyrics': { maxAge: 300, sMaxAge: 3600, isPublic: true },
    'GET:/lyrics/:id': { maxAge: 300, sMaxAge: 3600, isPublic: true },
}

// Normalize path to match config keys (replace UUIDs with :id)
const normalizePath = (path: string): string => {
    return path
        .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id')
}

export const cacheHeaders = async (c: Context, next: Next) => {
    await next()

    // Only cache successful GET responses
    if (c.req.method !== 'GET' || c.res.status !== 200) return

    const normalizedPath = normalizePath(c.req.path)
    const key = `GET:${normalizedPath}`
    const config = CACHE_CONFIG[key]

    if (config) {
        const visibility = config.isPublic ? 'public' : 'private'
        c.header('Cache-Control', `${visibility}, max-age=${config.maxAge}, s-maxage=${config.sMaxAge}, stale-while-revalidate=${config.sMaxAge}`)
    }
}

export { getDailySeed }
