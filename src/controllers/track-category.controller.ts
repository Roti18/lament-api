import { Context } from 'hono'
import { db } from '../config/db'

export const listTrackCategories = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM track_categories')
    return c.json(rs.rows)
}
