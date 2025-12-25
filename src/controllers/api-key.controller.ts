import { Context } from 'hono'
import { db } from '../config/db'

export const listApiKeys = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM api_keys')
    return c.json(rs.rows)
}

export const getApiKey = async (c: Context) => {
    const id = c.req.param('id')
    const rs = await db.execute({
        sql: 'SELECT * FROM api_keys WHERE id = ?',
        args: [id]
    })
    return c.json(rs.rows[0] || null)
}
