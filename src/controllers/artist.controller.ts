import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'

export const listArtists = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM artists')
    return c.json(rs.rows)
}

export const getArtist = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: 'SELECT * FROM artists WHERE id = ?',
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}

export const createArtist = async (c: Context) => {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const { name, slug, image_url } = body

    try {
        await db.execute({
            sql: 'INSERT INTO artists (id, name, slug, image_url) VALUES (?, ?, ?, ?)',
            args: [id, name, slug, image_url]
        })
        return c.json({ id, name, slug, image_url }, 201)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
}

export const updateArtist = async (c: Context) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { name, slug, image_url } = body

    await db.execute({
        sql: 'UPDATE artists SET name = ?, slug = ?, image_url = ? WHERE id = ?',
        args: [name, slug, image_url, id]
    })

    return c.json({ success: true })
}

export const deleteArtist = async (c: Context) => {
    const id = c.req.param('id')

    // Get existing record to find image_url
    const rs = await db.execute({
        sql: 'SELECT image_url FROM artists WHERE id = ?',
        args: [id]
    })
    const artist = rs.rows[0] as unknown as { image_url: string }

    if (artist && artist.image_url) {
        await deleteFileFromUrl(artist.image_url, 'image')
    }

    await db.execute({
        sql: 'DELETE FROM artists WHERE id = ?',
        args: [id]
    })
    return c.json({ success: true })
}
