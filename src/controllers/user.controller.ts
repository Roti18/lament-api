import { Context } from 'hono'
import { db } from '../config/db'

export const listUsers = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM users')
    return c.json(rs.rows)
}

export const getUser = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}
