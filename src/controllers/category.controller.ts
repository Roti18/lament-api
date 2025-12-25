import { Context } from 'hono'
import { db } from '../config/db'

export const listCategories = async (c: Context) => {
    try {
        const rs = await db.execute('SELECT * FROM categories')
        return c.json(rs.rows)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getCategory = async (c: Context) => {
    try {
        const rs = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [c.req.param('id')] })
        return c.json(rs.rows[0] || null)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createCategory = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO categories(id,name,slug)VALUES(?,?,?)', args: [id, body.name, body.slug] })
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateCategory = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE categories SET name=?,slug=? WHERE id=?', args: [body.name, body.slug, c.req.param('id')] })
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteCategory = async (c: Context) => {
    try {
        await db.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [c.req.param('id')] })
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
