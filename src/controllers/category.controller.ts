import { Context } from 'hono'
import { db } from '../config/db'

export const listCategories = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM categories')
    return c.json(rs.rows)
}

export const getCategory = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: 'SELECT * FROM categories WHERE id = ?',
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}

export const createCategory = async (c: Context) => {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const { name, slug } = body

    try {
        await db.execute({
            sql: 'INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)',
            args: [id, name, slug]
        })
        return c.json({ id, name, slug }, 201)
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
}

export const updateCategory = async (c: Context) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { name, slug } = body

    await db.execute({
        sql: 'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
        args: [name, slug, id]
    })

    return c.json({ success: true })
}

export const deleteCategory = async (c: Context) => {
    const id = c.req.param('id')
    await db.execute({
        sql: 'DELETE FROM categories WHERE id = ?',
        args: [id]
    })
    return c.json({ success: true })
}
