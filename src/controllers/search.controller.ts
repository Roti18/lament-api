import { Context } from 'hono'
import { db } from '../config/db'
import { optimizeImageUrl } from '../services/processor'

// --- Interfaces (Duplicated to avoid circular deps/complexity) ---
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

interface TrackRow {
    id: string
    title: string
    audio_url: string
    cover_url: string
    duration: number
    artist: string
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

// --- Controller ---
export const globalSearch = async (c: Context) => {
    try {
        const q = c.req.query('q') || ''
        if (!q.trim()) return c.json({ artists: [], albums: [], tracks: [] })

        const term = `%${q}%`
        const [artists, albums, tracks] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM artists WHERE name LIKE ? LIMIT 10', args: [term] }),
            db.execute({ sql: 'SELECT al.*, ar.name as artist FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.title LIKE ? LIMIT 10', args: [term] }),
            db.execute({ sql: 'SELECT t.id,t.title,t.audio_url,t.cover_url,t.duration,a.name AS artist FROM tracks t JOIN artists a ON a.id=t.artist_id WHERE t.status=\'ready\' AND (t.title LIKE ? OR a.name LIKE ?) ORDER BY t.created_at DESC LIMIT 20', args: [term, term] })
        ])

        return c.json({
            artists: (artists.rows as unknown as ArtistRow[]).map(transformArtist),
            albums: (albums.rows as unknown as AlbumRow[]).map(transformAlbum),
            tracks: (tracks.rows as unknown as TrackRow[]).map(transformTrack)
        })
    } catch {
        return c.json({ error: 'E_DB' }, 500)
    }
}
