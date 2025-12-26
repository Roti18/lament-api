import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { cacheGet, cacheSet, invalidateCache, TTL } from '../services/redis.service'
import { optimizeImageUrl } from '../services/processor'

interface ArtistRow {
    id: string
    name: string
    slug: string
    image_url: string
    tracks?: any[]
}

const transformArtist = (row: ArtistRow) => ({
    ...row,
    image_url: optimizeImageUrl(row.image_url, 'artist'),
    image_thumb: optimizeImageUrl(row.image_url, 'thumbnail')
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

export const listArtists = async (c: Context) => {
    try {
        const q = c.req.query('q')
        if (q) {
            const rs = await db.execute({ sql: 'SELECT * FROM artists WHERE name LIKE ?', args: [`%${q}%`] })
            return c.json((rs.rows as unknown as ArtistRow[]).map(transformArtist))
        }

        const cached = await cacheGet<ArtistRow[]>('cache:artists:list')
        if (cached) return c.json(cached.map(transformArtist))

        const rs = await db.execute('SELECT * FROM artists')
        await cacheSet('cache:artists:list', rs.rows, TTL.LIST)
        return c.json((rs.rows as unknown as ArtistRow[]).map(transformArtist))
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getArtist = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:artists:${id}`
        const cached = await cacheGet<ArtistRow>(cacheKey)
        if (cached) return c.json(transformArtist(cached))

        const rs = await db.execute({ sql: 'SELECT * FROM artists WHERE id=?', args: [id] })
        if (!rs.rows[0]) return c.json(null)

        const artist = rs.rows[0] as unknown as ArtistRow

        // Fetch Tracks for this Artist via track_artists join
        const trs = await db.execute({
            sql: 'SELECT t.id, t.title, t.audio_url, t.cover_url, t.duration FROM tracks t JOIN track_artists ta ON ta.track_id = t.id WHERE ta.artist_id = ? ORDER BY t.created_at DESC',
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

        // Fetch Albums for this Artist
        const albs = await db.execute({
            sql: 'SELECT id, title, slug, cover_url, year, type FROM albums WHERE artist_id = ? ORDER BY year DESC',
            args: [id]
        })

        const albums = (albs.rows as unknown as any[]).map(a => ({
            ...a,
            cover_url: optimizeImageUrl(a.cover_url, 'cover'),
            cover_thumb: optimizeImageUrl(a.cover_url, 'thumbnail')
        }))

        const result = { ...artist, tracks, albums }

        await cacheSet(cacheKey, result, TTL.ITEM)
        return c.json(transformArtist(result))
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createArtist = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO artists(id,name,slug,image_url)VALUES(?,?,?,?)', args: [id, body.name, body.slug, body.image_url] })
        await invalidateCache('artists')
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateArtist = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE artists SET name=?,slug=?,image_url=? WHERE id=?', args: [body.name, body.slug, body.image_url, c.req.param('id')] })
        await invalidateCache('artists')
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteArtist = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({ sql: 'SELECT image_url FROM artists WHERE id=?', args: [id] })
        if (rs.rows.length > 0 && (rs.rows[0] as any).image_url) deleteFileFromUrl((rs.rows[0] as any).image_url, 'image').catch(() => { })
        await db.execute({ sql: 'DELETE FROM artists WHERE id=?', args: [id] })
        await invalidateCache('artists')
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
