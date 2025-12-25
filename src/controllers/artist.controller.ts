import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'

export const listArtists = async (c: Context) => {
    try {
        const rs = await db.execute('SELECT * FROM artists')
        return c.json(rs.rows)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getArtist = async (c: Context) => {
    try {
        const rs = await db.execute({ sql: 'SELECT * FROM artists WHERE id=?', args: [c.req.param('id')] })
        return c.json(rs.rows[0] || null)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createArtist = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO artists(id,name,slug,image_url)VALUES(?,?,?,?)', args: [id, body.name, body.slug, body.image_url] })
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateArtist = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE artists SET name=?,slug=?,image_url=? WHERE id=?', args: [body.name, body.slug, body.image_url, c.req.param('id')] })
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteArtist = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({ sql: 'SELECT image_url FROM artists WHERE id=?', args: [id] })
        if (rs.rows.length > 0 && (rs.rows[0] as any).image_url) deleteFileFromUrl((rs.rows[0] as any).image_url, 'image').catch(() => { })
        await db.execute({ sql: 'DELETE FROM artists WHERE id=?', args: [id] })
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
