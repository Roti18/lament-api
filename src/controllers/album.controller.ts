import { Context } from 'hono'
import { db } from '../config/db'
import { deleteFileFromUrl } from '../services/storage'
import { cacheGet, cacheSet, invalidateCache, TTL } from '../services/redis.service'

export const listAlbums = async (c: Context) => {
    try {
        const cached = await cacheGet<unknown[]>('cache:albums:list')
        if (cached) return c.json(cached)

        const rs = await db.execute('SELECT * FROM albums')
        await cacheSet('cache:albums:list', rs.rows, TTL.LIST)
        return c.json(rs.rows)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const getAlbum = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const cacheKey = `cache:albums:${id}`
        const cached = await cacheGet<unknown>(cacheKey)
        if (cached) return c.json(cached)

        const rs = await db.execute({ sql: 'SELECT * FROM albums WHERE id=?', args: [id] })
        if (rs.rows[0]) await cacheSet(cacheKey, rs.rows[0], TTL.ITEM)
        return c.json(rs.rows[0] || null)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const createAlbum = async (c: Context) => {
    try {
        const body = await c.req.json()
        const id = crypto.randomUUID()
        await db.execute({ sql: 'INSERT INTO albums(id,artist_id,title,slug,cover_url,year,type,description)VALUES(?,?,?,?,?,?,?,?)', args: [id, body.artist_id, body.title, body.slug, body.cover_url, body.year, body.type, body.description] })
        await invalidateCache('albums')
        return c.json({ id }, 201)
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const updateAlbum = async (c: Context) => {
    try {
        const body = await c.req.json()
        await db.execute({ sql: 'UPDATE albums SET artist_id=?,title=?,slug=?,cover_url=?,year=?,type=?,description=? WHERE id=?', args: [body.artist_id, body.title, body.slug, body.cover_url, body.year, body.type, body.description, c.req.param('id')] })
        await invalidateCache('albums')
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}

export const deleteAlbum = async (c: Context) => {
    try {
        const id = c.req.param('id')
        const rs = await db.execute({ sql: 'SELECT cover_url FROM albums WHERE id=?', args: [id] })
        if (rs.rows.length > 0 && (rs.rows[0] as any).cover_url) deleteFileFromUrl((rs.rows[0] as any).cover_url, 'image').catch(() => { })
        await db.execute({ sql: 'DELETE FROM albums WHERE id=?', args: [id] })
        await invalidateCache('albums')
        return c.json({ s: 1 })
    } catch { return c.json({ error: 'E_DB' }, 500) }
}
