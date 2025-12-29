import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { CacheService } from '../services/cache.service'
import { optimizeImageUrl } from '../services/processor'

interface AlbumRow {
    id: string
    artist_id: string
    title: string
    slug: string
    cover_url: string
    year: number
    type: string
    description: string
    artist: string
    tracks?: any[]
}

const transformAlbum = (row: AlbumRow) => ({
    ...row,
    cover_url: optimizeImageUrl(row.cover_url, 'cover'),
    cover_thumb: optimizeImageUrl(row.cover_url, 'thumbnail')
})

// Helper to fetch artists for multiple tracks
interface Artist { id: string; name: string }
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

export const listAlbums = async (c: Context) => {
    try {
        const q = c.req.query('q')
        if (q) {
            const rs = await db.execute({
                sql: 'SELECT al.*, ar.name as artist FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.title LIKE ?',
                args: [`%${q}%`]
            })
            return c.json((rs.rows as unknown as AlbumRow[]).map(transformAlbum))
        }

        const cached = await CacheService.get<AlbumRow[]>('cache:albums:list')
        if (cached) return c.json(cached.map(transformAlbum))

        const rs = await db.execute('SELECT al.*, ar.name as artist FROM albums al JOIN artists ar ON ar.id = al.artist_id ORDER BY al.year DESC')
        await CacheService.set('cache:albums:list', rs.rows, 3600)
        return c.json((rs.rows as unknown as AlbumRow[]).map(transformAlbum))
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getAlbum = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:albums:${id}`
        const cached = await CacheService.get<AlbumRow>(cacheKey)
        if (cached) return c.json(transformAlbum(cached))

        const rs = await db.execute({
            sql: 'SELECT al.*, ar.name as artist FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.id=?',
            args: [id]
        })
        if (!rs.rows[0]) return c.json(null)

        const album = rs.rows[0] as unknown as AlbumRow

        // Fetch Tracks
        const trs = await db.execute({
            sql: 'SELECT id, title, audio_url, cover_url, duration FROM tracks WHERE album_id = ? ORDER BY created_at DESC',
            args: [id]
        })

        const trackRows = trs.rows as unknown as any[]
        const artistsMap = await fetchArtistsForTracks(trackRows.map(t => t.id))

        const tracks = trackRows.map(t => ({
            ...t,
            artists: artistsMap.get(t.id) || [],
            cover_url: optimizeImageUrl(t.cover_url, 'cover'),
            cover_thumb: optimizeImageUrl(t.cover_url, 'thumbnail')
        }))

        const result = { ...album, tracks }

        await CacheService.set(cacheKey, result, 3600)
        return c.json(transformAlbum(result))
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createAlbum = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO albums(id,artist_id,title,slug,cover_url,year,type,description)VALUES(?,?,?,?,?,?,?,?)', args: [id, body.artist_id, body.title, body.slug, body.cover_url, body.year, body.type, body.description] })
        await CacheService.del('cache:albums:list')
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateAlbum = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE albums SET artist_id=?,title=?,slug=?,cover_url=?,year=?,type=?,description=? WHERE id=?', args: [body.artist_id, body.title, body.slug, body.cover_url, body.year, body.type, body.description, c.req.param('id')] })
        await CacheService.del('cache:albums:list')
        await CacheService.del(`cache:albums:${c.req.param('id')}`)
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteAlbum = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({ sql: 'SELECT cover_url FROM albums WHERE id=?', args: [id] })
        if (rs.rows.length > 0 && (rs.rows[0] as any).cover_url) deleteFileFromUrl((rs.rows[0] as any).cover_url, 'image').catch(() => { })
        await db.execute({ sql: 'DELETE FROM albums WHERE id=?', args: [id] })
        await CacheService.del('cache:albums:list')
        await CacheService.del(`cache:albums:${id}`)
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
