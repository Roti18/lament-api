import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'

export const listAlbums = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM albums')
    return c.json(rs.rows)
}

export const getAlbum = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: 'SELECT * FROM albums WHERE id = ?',
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}

export const createAlbum = async (c: Context) => {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const { artist_id, title, slug, cover_url, year, type, description } = body

    try {
        await db.execute({
            sql: `INSERT INTO albums (id, artist_id, title, slug, cover_url, year, type, description) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [id, artist_id, title, slug, cover_url, year, type, description]
        })
        return c.json({ id, ...body }, 201)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
}

export const updateAlbum = async (c: Context) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { artist_id, title, slug, cover_url, year, type, description } = body

    await db.execute({
        sql: `UPDATE albums SET artist_id = ?, title = ?, slug = ?, cover_url = ?, year = ?, type = ?, description = ? 
              WHERE id = ?`,
        args: [artist_id, title, slug, cover_url, year, type, description, id]
    })

    return c.json({ success: true })
}

export const deleteAlbum = async (c: Context) => {
    const id = c.req.param('id')

    // Get existing record
    const rs = await db.execute({
        sql: 'SELECT cover_url FROM albums WHERE id = ?',
        args: [id]
    })
    const album = rs.rows[0] as unknown as { cover_url: string }

    if (album && album.cover_url) {
        await deleteFileFromUrl(album.cover_url, 'image')
    }

    await db.execute({
        sql: 'DELETE FROM albums WHERE id = ?',
        args: [id]
    })
    return c.json({ success: true })
}
