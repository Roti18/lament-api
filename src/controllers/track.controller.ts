import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { CacheService } from '../services/cache.service'
import { optimizeImageUrl } from '../services/processor'
import { getDailySeed } from '../middlewares/cache.middleware'

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

        // ETag support for 304 responses (reduces FE CPU by skipping JSON parse)
        const cacheKey = q ? `cache:tracks:search:${q}` : 'cache:tracks:list'
        const etagKey = `etag:${cacheKey}`
        const storedEtag = await CacheService.get<string>(etagKey)
        const clientEtag = c.req.header('If-None-Match')

        if (storedEtag && clientEtag === storedEtag) {
            return c.body(null, 304)
        }

        const cached = !q ? await CacheService.get<TrackRow[]>('cache:tracks:list') : null
        if (cached) {
            if (storedEtag) c.header('ETag', storedEtag)
            return c.json(cached.map(transformTrack))
        }

        const rs = await db.execute({ sql, args })
        const tracks = rs.rows as unknown as TrackRow[]
        const artistsMap = await fetchArtistsForTracks(tracks.map(t => t.id))

        const result = tracks.map(t => ({ ...t, artists: artistsMap.get(t.id) || [] }))

        // Generate new ETag and cache
        const newEtag = `"tracks-${Date.now()}"`
        if (!q) {
            await CacheService.set('cache:tracks:list', result, 1800)
            await CacheService.set(etagKey, newEtag, 1800)
        }

        c.header('ETag', newEtag)
        return c.json(result.map(transformTrack))
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const getRandomTracks = async (c: Context) => {
    try {
        const limit = parseInt(c.req.query('limit') || '10')
        const seed = getDailySeed()

        // Deterministic pseudo-random using daily rotating seed (cache-friendly)
        // ORDER BY (ROWID % seed) produces consistent results per day
        const sql = `SELECT id, title, audio_url, cover_url, duration, album_id 
                     FROM tracks WHERE status='ready' 
                     ORDER BY (ROWID % ?) DESC, created_at DESC LIMIT ?`

        const rs = await db.execute({ sql, args: [seed, limit] })
        const tracks = rs.rows as unknown as TrackRow[]

        const artistsMap = await fetchArtistsForTracks(tracks.map(t => t.id))
        const result = tracks.map(t => ({ ...t, artists: artistsMap.get(t.id) || [] }))

        return c.json(result.map(transformTrack))
    } catch (e) {
        return c.json({ error: 'E_DB' }, 500)
    }
}


export const getTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:tracks:${id}`
        const cached = await CacheService.get<TrackRow>(cacheKey)
        if (cached) return c.json(transformTrack(cached))

        const rs = await db.execute({ sql: 'SELECT id, title, audio_url, cover_url, duration, album_id FROM tracks WHERE id=?', args: [id] })
        if (rs.rows.length === 0) return c.json({ error: 'E_NF' }, 404)

        const track = rs.rows[0] as unknown as TrackRow
        const artistsMap = await fetchArtistsForTracks([track.id])
        track.artists = artistsMap.get(track.id) || []

        await CacheService.set(cacheKey, track, 3600)
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
        await CacheService.del('cache:tracks:list')
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
        await CacheService.del('cache:tracks:list')
        await CacheService.del(`cache:tracks:${id}`)
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
            if (t.audio_url) deleteFileFromUrl(t.audio_url).catch(() => { })
            if (t.cover_url) deleteFileFromUrl(t.cover_url).catch(() => { })
        }
        await db.execute({ sql: 'DELETE FROM tracks WHERE id=?', args: [id] })
        await CacheService.del('cache:tracks:list')
        await CacheService.del(`cache:tracks:${id}`)
        return c.json({ s: 1 })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}
