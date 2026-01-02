import { Context } from 'hono'
import { db } from '../config/db'


export const createRequest = async (c: Context) => {
    try {
        const payload = c.get('jwtPayload')
        if (!payload) return c.json({ error: 'Unauthorized' }, 401)

        const body = await c.req.json()
        const { query, metadata } = body

        if (!query) {
            return c.json({ error: 'E_MISSING_FIELDS' }, 400)
        }

        const id = crypto.randomUUID()
        const userId = payload.sub

        await db.execute({
            sql: `INSERT INTO requests (id, user_id, query, metadata) VALUES (?, ?, ?, ?)`,
            args: [id, userId, query, metadata ? JSON.stringify(metadata) : null]
        })

        return c.json({ id, status: 'pending' }, 201)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const listRequests = async (c: Context) => {
    try {
        const payload = c.get('jwtPayload')
        if (!payload || payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

        const rs = await db.execute(`
            SELECT r.*, u.username, u.name, u.avatar_url 
            FROM requests r 
            LEFT JOIN users u ON r.user_id = u.id 
            ORDER BY r.created_at DESC
        `)

        const requests = rs.rows.map(r => ({
            ...r,
            metadata: r.metadata ? JSON.parse(r.metadata as string) : null
        }))

        return c.json(requests)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const getMyRequests = async (c: Context) => {
    try {
        const payload = c.get('jwtPayload')
        if (!payload) return c.json({ error: 'Unauthorized' }, 401)

        const rs = await db.execute({
            sql: `SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC`,
            args: [payload.sub]
        })

        const requests = rs.rows.map(r => ({
            ...r,
            metadata: r.metadata ? JSON.parse(r.metadata as string) : null
        }))

        return c.json(requests)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'E_DB' }, 500)
    }
}

export const updateRequestStatus = async (c: Context) => {
    try {
        const payload = c.get('jwtPayload')
        if (!payload || payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

        const id = c.req.param('id')
        const { status } = await c.req.json()

        if (!['pending', 'done', 'rejected'].includes(status)) {
            return c.json({ error: 'E_INVALID_STATUS' }, 400)
        }

        await db.execute({
            sql: `UPDATE requests SET status = ? WHERE id = ?`,
            args: [status, id]
        })

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'E_DB' }, 500)
    }
}
