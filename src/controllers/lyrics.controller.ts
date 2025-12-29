import { Context } from 'hono'
import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDel, TTL } from '../services/redis.service'

interface Lyric {
    id: string
    track_id: string
    language: string
    variant: string
    content: string
    created_at: string
}

export const getLyricsByTrack = async (c: Context) => {
    try {
        const trackId = c.req.param('id')
        const cacheKey = `cache:lyrics:${trackId}`
        const cached = await cacheGet<Lyric[]>(cacheKey)
        if (cached) return c.json(cached)

        const rs = await db.execute({
            sql: 'SELECT * FROM lyrics WHERE track_id = ? ORDER BY created_at ASC',
            args: [trackId]
        })
        const lyrics = rs.rows as unknown as Lyric[]

        await cacheSet(cacheKey, lyrics, TTL.ITEM)
        return c.json(lyrics)
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const addLyricVariant = async (c: Context) => {
    try {
        const trackId = c.req.param('id')
        const body = await c.req.json()
        const id = crypto.randomUUID()

        if (!body.content) return c.json({ error: 'E_VALIDATION' }, 400)

        // Ensure track exists? Foreign key handles it if we enabled PRAGMA foreign_keys = ON used by LibSQL by default usually but good to check.

        await db.execute({
            sql: 'INSERT INTO lyrics(id, track_id, language, variant, content) VALUES (?, ?, ?, ?, ?)',
            args: [id, trackId, body.language || 'en', body.variant || 'original', body.content]
        })

        await cacheDel(`cache:lyrics:${trackId}`)
        return c.json({ id }, 201)
    } catch (e) {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const deleteLyric = async (c: Context) => {
    try {
        const id = c.req.param('lyricId')
        const rs = await db.execute({ sql: 'SELECT track_id FROM lyrics WHERE id = ?', args: [id] })
        if (rs.rows.length > 0) {
            const trackId = rs.rows[0].track_id as string
            await db.execute({ sql: 'DELETE FROM lyrics WHERE id = ?', args: [id] })
            await cacheDel(`cache:lyrics:${trackId}`)
        }
        return c.json({ s: 1 })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}
