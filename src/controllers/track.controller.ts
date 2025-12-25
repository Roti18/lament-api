import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'

export const listTracks = async (c: Context) => {
    try {
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
    } catch (e: any) {
        console.error('listTracks Error:', e)
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
}

export const getTrack = async (c: Context) => {
    try {
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
        if (rs.rows.length === 0) {
            return c.json({ error: 'Track not found' }, 404)
        }
        return c.json(rs.rows[0])
    } catch (e: any) {
        console.error('getTrack Error:', e)
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
}

export const createTrack = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({
            sql: `INSERT INTO tracks (id, title, audio_url, cover_url, duration, artist_id, album_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')`,
            args: [id, body.title, body.audio_url, body.cover_url, body.duration || 0, body.artist_id, body.album_id || null]
        })
        return c.json({ success: true, id }, 201)
    } catch (e: any) {
        console.error('createTrack Error:', e)
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
}

export const updateTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        await db.execute({
            sql: `UPDATE tracks SET title = ?, audio_url = ?, cover_url = ?, duration = ?, artist_id = ?, album_id = ? WHERE id = ?`,
            args: [body.title, body.audio_url, body.cover_url, body.duration, body.artist_id, body.album_id, id]
        })
        return c.json({ success: true })
    } catch (e: any) {
        console.error('updateTrack Error:', e)
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
}

export const deleteTrack = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({
            sql: 'SELECT audio_url, cover_url FROM tracks WHERE id = ?',
            args: [id]
        })
        if (rs.rows.length > 0) {
            const track: any = rs.rows[0]
            if (track.audio_url) await deleteFileFromUrl(track.audio_url, 'audio').catch(() => { })
            if (track.cover_url) await deleteFileFromUrl(track.cover_url, 'image').catch(() => { })
        }
        await db.execute({ sql: 'DELETE FROM tracks WHERE id = ?', args: [id] })
        return c.json({ success: true })
    } catch (e: any) {
        console.error('deleteTrack Error:', e)
        return c.json({ error: 'Database error', details: e.message }, 500)
    }
}
