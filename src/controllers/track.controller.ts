import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { cacheGet, cacheSet, invalidateCache, TTL } from '../services/redis.service'
import { optimizeImageUrl } from '../services/processor'

interface Artist { id: string; name: string }
interface TrackRow {
    id: string
    title: string
    audio_url: string
    cover_url: string
    duration: number
    album_id?: string
    artists?: Artist[]
}

const transformTrack = (row: TrackRow) => ({
    ...row,
    cover_url: optimizeImageUrl(row.cover_url, 'cover'),
    cover_thumb: optimizeImageUrl(row.cover_url, 'thumbnail')
})

// Helper to fetch artists for multiple tracks
const fetchArtistsForTracks = async (trackIds: string[]): Promise<Map<string, Artist[]>> => {
    if (trackIds.length === 0) return new Map()
    const placeholders = trackIds.map(() => '?').join(',')
    const rs = await db.execute({
        sql: `SELECT ta.track_id, a.id, a.name FROM track_artists ta JOIN artists a ON a.id = ta.artist_id WHERE ta.track_id IN (${placeholders})`,
        args: trackIds
    })
    const map = new Map<string, Artist[]>()
    for (const row of rs.rows as any[]) {
        const arr = map.get(row.track_id) || []
        arr.push({ id: row.id, name: row.name })
        map.set(row.track_id, arr)
    }
    return map
}

export const listTracks = async (c: Context) => {
    try {
        const q = c.req.query('q')
        let sql = "SELECT id, title, audio_url, cover_url, duration, album_id FROM tracks WHERE status='ready'"
        const args: any[] = []
        if (q) {
            sql += " AND title LIKE ?"
            args.push(`%${q}%`)
        }
        sql += " ORDER BY created_at DESC"

        const cached = !q ? await cacheGet<TrackRow[]>('cache:tracks:list') : null
        if (cached) return c.json(cached.map(transformTrack))

        const rs = await db.execute({ sql, args })
        const tracks = rs.rows as unknown as TrackRow[]
        const artistsMap = await fetchArtistsForTracks(tracks.map(t => t.id))

        const result = tracks.map(t => ({ ...t, artists: artistsMap.get(t.id) || [] }))

        if (!q) await cacheSet('cache:tracks:list', result, TTL.LIST)
        return c.json(result.map(transformTrack))
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

        const rs = await db.execute({ sql: 'SELECT id, title, audio_url, cover_url, duration, album_id FROM tracks WHERE id=?', args: [id] })
        if (rs.rows.length === 0) return c.json({ error: 'E_NF' }, 404)

        const track = rs.rows[0] as unknown as TrackRow
        const artistsMap = await fetchArtistsForTracks([track.id])
        track.artists = artistsMap.get(track.id) || []

        await cacheSet(cacheKey, track, TTL.ITEM)
        return c.json(transformTrack(track))
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
