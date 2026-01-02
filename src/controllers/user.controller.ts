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

export const getMe = async (c: Context) => {
    const payload = c.get('jwtPayload')
    if (!payload) return c.json({ error: 'Unauthorized' }, 401)

    const rs = await db.execute({
        sql: "SELECT id, google_id, email, username, name, avatar_url, role, created_at FROM users WHERE id = ?",
        args: [payload.sub]
    })

    if (rs.rows.length === 0) return c.json({ error: 'User not found' }, 404)
    return c.json(rs.rows[0])
}
