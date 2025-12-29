import { Context } from 'hono'
import { db } from '../config/db'
import { CacheService } from '../services/cache.service'

export const listCategories = async (c: Context) => {
    try {
        const cached = await CacheService.get<unknown[]>('cache:categories:list')
        if (cached) return c.json(cached)

        const rs = await db.execute('SELECT * FROM categories')
        await CacheService.set('cache:categories:list', rs.rows, 3600)
        return c.json(rs.rows)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getCategory = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:categories:${id}`
        const cached = await CacheService.get<unknown>(cacheKey)
        if (cached) return c.json(cached)

        const rs = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] })
        if (rs.rows[0]) await CacheService.set(cacheKey, rs.rows[0], 3600)
        return c.json(rs.rows[0] || null)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createCategory = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO categories(id,name,slug)VALUES(?,?,?)', args: [id, body.name, body.slug] })
        await CacheService.del('cache:categories:list')
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateCategory = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE categories SET name=?,slug=? WHERE id=?', args: [body.name, body.slug, c.req.param('id')] })
        await CacheService.del('cache:categories:list')
        await CacheService.del(`cache:categories:${c.req.param('id')}`)
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteCategory = async (c: Context) => {
    try {
        await db.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [c.req.param('id')] })
        await CacheService.del('cache:categories:list')
        await CacheService.del(`cache:categories:${c.req.param('id')}`)
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
