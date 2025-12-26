import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { cacheGet, cacheSet, invalidateCache, TTL } from '../services/redis.service'
import { optimizeImageUrl } from '../services/processor'

interface TrackRow {
    id: string
    title: string
    audio_url: string
    cover_url: string
    duration: number
    artist: string
}

const transformTrack = (row: TrackRow) => ({
    ...row,
    cover_url: optimizeImageUrl(row.cover_url, 'cover'),
    cover_thumb: optimizeImageUrl(row.cover_url, 'thumbnail')
})

export const listTracks = async (c: Context) => {
    try {
        const q = c.req.query('q')
        if (q) {
            const rs = await db.execute({ sql: 'SELECT t.id,t.title,t.audio_url,t.cover_url,t.duration,a.name AS artist FROM tracks t JOIN artists a ON a.id=t.artist_id WHERE t.status=\'ready\' AND t.title LIKE ? ORDER BY t.created_at DESC', args: [`%${q}%`] })
            return c.json((rs.rows as unknown as TrackRow[]).map(transformTrack))
        }

        const cached = await cacheGet<TrackRow[]>('cache:tracks:list')
        if (cached) return c.json(cached.map(transformTrack))

        const rs = await db.execute('SELECT t.id,t.title,t.audio_url,t.cover_url,t.duration,a.name AS artist FROM tracks t JOIN artists a ON a.id=t.artist_id WHERE t.status=\'ready\' ORDER BY t.created_at DESC')
        await cacheSet('cache:tracks:list', rs.rows, TTL.LIST)
        return c.json((rs.rows as unknown as TrackRow[]).map(transformTrack))
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const getTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:tracks:${id}`
        const cached = await cacheGet<TrackRow>(cacheKey)
        if (cached) return c.json(transformTrack(cached))

        const rs = await db.execute({ sql: 'SELECT t.id,t.title,t.audio_url,t.cover_url,t.duration,a.name AS artist FROM tracks t JOIN artists a ON a.id=t.artist_id WHERE t.id=?', args: [id] })
        if (rs.rows.length === 0) return c.json({ error: 'E_NF' }, 404)
        await cacheSet(cacheKey, rs.rows[0], TTL.ITEM)
        return c.json(transformTrack(rs.rows[0] as unknown as TrackRow))
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const createTrack = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO tracks(id,title,audio_url,cover_url,duration,artist_id,album_id,status)VALUES(?,?,?,?,?,?,?,\'ready\')', args: [id, body.title, body.audio_url, body.cover_url, body.duration || 0, body.artist_id, body.album_id || null] })
        await invalidateCache('tracks')
        return c.json({ id }, 201)
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const updateTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE tracks SET title=?,audio_url=?,cover_url=?,duration=?,artist_id=?,album_id=? WHERE id=?', args: [body.title, body.audio_url, body.cover_url, body.duration, body.artist_id, body.album_id, id] })
        await invalidateCache('tracks')
        return c.json({ s: 1 })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const deleteTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({ sql: 'SELECT audio_url,cover_url FROM tracks WHERE id=?', args: [id] })
        if (rs.rows.length > 0) {
            const t = rs.rows[0] as unknown as { audio_url: string, cover_url: string }
            if (t.audio_url) deleteFileFromUrl(t.audio_url, 'audio').catch(() => { })
            if (t.cover_url) deleteFileFromUrl(t.cover_url, 'image').catch(() => { })
        }
        await db.execute({ sql: 'DELETE FROM tracks WHERE id=?', args: [id] })
        await invalidateCache('tracks')
        return c.json({ s: 1 })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}
