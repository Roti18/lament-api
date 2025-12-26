import { Context } from 'hono'
import { db } from '../config/db'
import { optimizeImageUrl } from '../services/processor'

// --- Interfaces ---
interface ArtistRow {
    id: string
    name: string
    slug: string
    image_url: string
}

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
}

interface Artist { id: string; name: string }
interface TrackRow {
    id: string
    title: string
    audio_url: string
    cover_url: string
    duration: number
    artists?: Artist[]
}

// --- Transformers ---
const transformArtist = (row: ArtistRow) => ({
    ...row,
    image_url: optimizeImageUrl(row.image_url, 'artist'),
    image_thumb: optimizeImageUrl(row.image_url, 'thumbnail')
})

const transformAlbum = (row: AlbumRow) => ({
    ...row,
    cover_url: optimizeImageUrl(row.cover_url, 'cover'),
    cover_thumb: optimizeImageUrl(row.cover_url, 'thumbnail')
})

const transformTrack = (row: TrackRow) => ({
    ...row,
    cover_url: optimizeImageUrl(row.cover_url, 'cover'),
    cover_thumb: optimizeImageUrl(row.cover_url, 'thumbnail')
})

// --- Helper ---
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

// --- Controller ---
export const globalSearch = async (c: Context) => {
    try {
        const q = c.req.query('q') || ''
        if (!q.trim()) return c.json({ artists: [], albums: [], tracks: [] })

        const term = `%${q}%`

        // Fetch artists and albums in parallel, tracks separately for artist resolution
        const [artistsRes, albumsRes] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM artists WHERE name LIKE ? LIMIT 10', args: [term] }),
            db.execute({ sql: 'SELECT al.*, ar.name as artist FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.title LIKE ? LIMIT 10', args: [term] })
        ])

        // Fetch tracks that match title OR have an artist that matches
        const tracksRes = await db.execute({
            sql: `SELECT DISTINCT t.id, t.title, t.audio_url, t.cover_url, t.duration 
                  FROM tracks t 
                  LEFT JOIN track_artists ta ON ta.track_id = t.id 
                  LEFT JOIN artists a ON a.id = ta.artist_id 
                  WHERE t.status='ready' AND (t.title LIKE ? OR a.name LIKE ?) 
                  ORDER BY t.created_at DESC LIMIT 20`,
            args: [term, term]
        })

        const trackRows = tracksRes.rows as unknown as TrackRow[]
        const artistsMap = await fetchArtistsForTracks(trackRows.map(t => t.id))

        const tracks = trackRows.map(t => ({
            ...t,
            artists: artistsMap.get(t.id) || []
        }))

        return c.json({
            artists: (artistsRes.rows as unknown as ArtistRow[]).map(transformArtist),
            albums: (albumsRes.rows as unknown as AlbumRow[]).map(transformAlbum),
            tracks: tracks.map(transformTrack)
        })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}

