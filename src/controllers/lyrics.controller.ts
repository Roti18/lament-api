import { Context } from 'hono'
import { db } from '../config/db'
import { cacheGet, cacheSet, TTL } from '../services/redis.service'
import { parseLRC, LyricLine } from '../services/lyric-parser.service'

interface Lyric {
    id: string
    track_id: string
    language: string
    variant: string
    content: string
    created_at: string
}

interface LyricsResponse {
    track_id: string
    variant: string
    lines: LyricLine[]
}

export const getLyricsByTrack = async (c: Context) => {
    try {
        const trackId = c.req.param('id')
        const variant = c.req.query('variant') || 'original'

        // 1. Check Track Existence
        const trackCheck = await db.execute({
            sql: 'SELECT id FROM tracks WHERE id = ?',
            args: [trackId]
        })
        if (trackCheck.rows.length === 0) {
            return c.json({ error: 'Track not found' }, 404)
        }

        // 2. Caching Strategy
        const cacheKey = `lyrics:${trackId}:${variant}`
        const cachedLines = await cacheGet<LyricLine[]>(cacheKey)
        if (cachedLines) {
            return c.json({
                track_id: trackId,
                variant: variant,
                lines: cachedLines
            })
        }

        // 3. Fetch Raw Data (Database)
        const rs = await db.execute({
            sql: 'SELECT * FROM lyrics WHERE track_id = ?',
            args: [trackId]
        })
        const allLyrics = rs.rows as unknown as Lyric[]

        if (allLyrics.length === 0) {
            return c.json({ error: 'No lyrics found' }, 404)
        }

        // 4. Variant Logic & Fallback
        let selectedLyric = allLyrics.find(l => l.variant === variant)
        let actualVariant = variant

        if (!selectedLyric) {
            // Fallback to original
            selectedLyric = allLyrics.find(l => l.variant === 'original')
            actualVariant = 'original'
        }

        if (!selectedLyric) {
            // No lyrics found at all (should be handled by length check above, but being safe)
            return c.json({ error: 'No lyrics found' }, 404)
        }

        // 5. Normalization / Parsing
        const normalizedLines = parseLRC(selectedLyric.content)

        // 6. Write Back to Redis Cache (TTL 24 hours)
        // Note: Using the original requested variant for cache key to ensure subsequent 
        // requests for the same variant hit the cache immediately even if it was a fallback.
        await cacheSet(cacheKey, normalizedLines, 86400) // 24 hours in seconds

        return c.json({
            track_id: trackId,
            variant: actualVariant,
            lines: normalizedLines
        } as LyricsResponse)

    } catch (error) {
        console.error('Lyrics error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const addLyricVariant = async (c: Context) => {
    // Keep or update addLyricVariant if needed, but the primary task is the GET endpoint.
    // Let's keep it simple for now or refine it to match the schema if it changed.
    try {
        const trackId = c.req.param('id')
        const body = await c.req.json()
        const id = crypto.randomUUID()

        if (!body.content) return c.json({ error: 'Content is required' }, 400)

        await db.execute({
            sql: 'INSERT INTO lyrics(id, track_id, language, variant, content) VALUES (?, ?, ?, ?, ?)',
            args: [id, trackId, body.language || 'en', body.variant || 'original', body.content]
        })

        // Invalidate cache for this variant
        await cacheSet(`lyrics:${trackId}:${body.variant || 'original'}`, null, 0)

        return c.json({ id }, 201)
    } catch (e) {
        return c.json({ error: 'Database error' }, 500)
    }
}

export const deleteLyric = async (c: Context) => {
    try {
        const id = c.req.param('lyricId')
        const rs = await db.execute({ sql: 'SELECT track_id, variant FROM lyrics WHERE id = ?', args: [id] })
        if (rs.rows.length === 0) return c.json({ error: 'Lyric not found' }, 404)

        const { track_id, variant } = rs.rows[0] as unknown as { track_id: string, variant: string }

        await db.execute({ sql: 'DELETE FROM lyrics WHERE id = ?', args: [id] })

        // Invalidate cache
        await cacheSet(`lyrics:${track_id}:${variant}`, null, 0)

        return c.json({ success: true })
    } catch {
        return c.json({ error: 'Database error' }, 500)
    }
}
