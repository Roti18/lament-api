import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'

export const listTracks = async (c: Context) => {
    const rs = await db.execute(`
    SELECT
      t.id,
      t.title,
      t.audio_url,
      t.cover_url,
      t.duration,
      a.name AS artist
    FROM tracks t
    JOIN artists a ON a.id = t.artist_id
    WHERE t.status = 'ready'
    ORDER BY t.created_at DESC
  `)

    return c.json(rs.rows)
}

export const getTrack = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: `
    SELECT
      t.id,
      t.title,
      t.audio_url,
      t.cover_url,
      t.duration,
      a.name AS artist
    FROM tracks t
    JOIN artists a ON a.id = t.artist_id
    WHERE t.id = ?
  `,
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}

export const createTrack = async (c: Context) => {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const {
        artist_id, album_id, title, slug,
        original_id, provider_url, audio_url, cover_url,
        duration, bitrate, format, status, source
    } = body

    try {
        await db.execute({
            sql: `INSERT INTO tracks (
                id, artist_id, album_id, title, slug, 
                original_id, provider_url, audio_url, cover_url,
                duration, bitrate, format, status, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id, artist_id, album_id, title, slug,
                original_id, provider_url, audio_url, cover_url,
                duration, bitrate, format, status || 'ready', source || 'youtube'
            ]
        })
        return c.json({ id, ...body }, 201)
    } catch (e: any) {
        console.error(e)
        return c.json({ error: e.message }, 500)
    }
}

export const updateTrack = async (c: Context) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const {
        artist_id, album_id, title, slug,
        original_id, provider_url, audio_url, cover_url,
        duration, bitrate, format, status, source
    } = body

    await db.execute({
        sql: `UPDATE tracks SET 
            artist_id = ?, album_id = ?, title = ?, slug = ?, 
            original_id = ?, provider_url = ?, audio_url = ?, cover_url = ?,
            duration = ?, bitrate = ?, format = ?, status = ?, source = ?
            WHERE id = ?`,
        args: [
            artist_id, album_id, title, slug,
            original_id, provider_url, audio_url, cover_url,
            duration, bitrate, format, status, source, id
        ]
    })

    return c.json({ success: true })
}

export const deleteTrack = async (c: Context) => {
    const id = c.req.param('id')

    const rs = await db.execute({
        sql: 'SELECT audio_url, cover_url FROM tracks WHERE id = ?',
        args: [id]
    })
    const track = rs.rows[0] as unknown as { audio_url: string, cover_url: string }

    if (track) {
        if (track.audio_url) await deleteFileFromUrl(track.audio_url, 'audio')
        if (track.cover_url) await deleteFileFromUrl(track.cover_url, 'image')
    }

    await db.execute({
        sql: 'DELETE FROM tracks WHERE id = ?',
        args: [id]
    })
    return c.json({ success: true })
}
