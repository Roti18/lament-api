import { Context } from 'hono'
import { db } from '../config/db'
import { CacheService } from '../services/cache.service'
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
            sql: 'SELECT id, title, duration FROM tracks WHERE id = ?',
            args: [trackId]
        })
        if (trackCheck.rows.length === 0) {
            return c.json({ error: 'Track not found' }, 404)
        }
        const trackData = trackCheck.rows[0] as unknown as { id: string, title: string, duration: number }
        const durationMs = (trackData.duration || 0) * 1000 // duration is usually seconds in DB

        // 2. Caching Strategy
        const cacheKey = `lyrics:${trackId}:${variant}`
        const cachedData = await CacheService.get<any>(cacheKey)
        if (cachedData && cachedData.lines && Array.isArray(cachedData.lines)) {
            return c.json(cachedData)
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

        if (!selectedLyric) {
            // Fallback to original
            selectedLyric = allLyrics.find(l => l.variant === 'original')
        }

        if (!selectedLyric) {
            // No lyrics found at all (should be handled by length check above, but being safe)
            return c.json({ error: 'No lyrics found' }, 404)
        }

        // 5. Normalization / Parsing
        const { lines: normalizedLines, synced } = parseLRC(selectedLyric.content, durationMs, trackData.title)
        const responseData = {
            variant: selectedLyric.variant,
            lines: normalizedLines,
            synced
        }

        // 6. Cache & Return
        // Cache result (24h)
        await CacheService.set(cacheKey, responseData, 86400)

        return c.json(responseData)

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
        const cacheKey = `lyrics:${trackId}:${body.variant || 'original'}`
        await CacheService.del(cacheKey)

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

        // Clear cache for this track (all variants possible, but mainly we clear specific ones or logic needed)
        // For simplicity, we might iterate variants or just rely on variant param if provided
        // But if deleting a lyric entry, we should clear the cache for that variant
        // Since we don't know variant easily here without query, better logic needed.
        // Assuming variant is passed or we just clear standard ones.
        const variants = ['original', 'romanized', 'translated']
        for (const v of variants) {
            await CacheService.del(`lyrics:${track_id}:${v}`)
        }

        return c.json({ success: true })
    } catch {
        return c.json({ error: 'Database error' }, 500)
    }
}
