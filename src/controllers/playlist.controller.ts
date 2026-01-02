import { Context } from 'hono'
import { db } from '../config/db'


const checkOwnership = async (playlistId: string, userId: string): Promise<boolean> => {
    const rs = await db.execute({
        sql: "SELECT id FROM playlists WHERE id = ? AND user_id = ?",
        args: [playlistId, userId]
    })
    return rs.rows.length > 0
}

export const createPlaylist = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { name, title, description } = await c.req.json()
        const playlistTitle = title || name

        if (!playlistTitle) return c.json({ error: 'E_MISSING_NAME' }, 400)

        const id = crypto.randomUUID()

        await db.execute({
            sql: "INSERT INTO playlists (id, title, description, user_id) VALUES (?, ?, ?, ?)",
            args: [id, playlistTitle, description || '', user.sub]
        })

        return c.json({ id, title: playlistTitle, description, user_id: user.sub, total_tracks: 0 }, 201)
    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}

export const listMyPlaylists = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const rs = await db.execute({
            sql: `
                SELECT p.*, COUNT(pt.track_id) as total_tracks 
                FROM playlists p
                LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
                WHERE p.user_id = ?
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `,
            args: [user.sub]
        })

        return c.json(rs.rows)
    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}

export const deletePlaylist = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const isOwner = await checkOwnership(id, user.sub)

        if (!isOwner) return c.json({ error: 'E_NOT_FOUND_OR_PERM' }, 404)

        await db.execute({
            sql: "DELETE FROM playlists WHERE id = ? AND user_id = ?",
            args: [id, user.sub]
        })

        return c.json({ success: true, id })
    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}

export const updatePlaylist = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const { title, name, description, cover_url } = await c.req.json()
        const playlistTitle = title || name

        const isOwner = await checkOwnership(id, user.sub)
        if (!isOwner) return c.json({ error: 'E_NOT_FOUND_OR_PERM' }, 404)

        const updates: string[] = []
        const args: any[] = []

        if (playlistTitle) { updates.push("title = ?"); args.push(playlistTitle) }
        if (description !== undefined) { updates.push("description = ?"); args.push(description) }
        if (cover_url !== undefined) { updates.push("cover_url = ?"); args.push(cover_url) }

        if (updates.length > 0) {
            args.push(id)
            args.push(user.sub)
            await db.execute({
                sql: `UPDATE playlists SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                args: args
            })
        }

        return c.json({ success: true, id, updates: updates.length })
    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}

export const getPlaylistById = async (c: Context) => {
    try {
        const id = c.req.param('id')

        const playlistRs = await db.execute({
            sql: `
                SELECT p.*, u.username as owner_name, u.avatar_url as owner_avatar,
                (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as total_tracks
                FROM playlists p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `,
            args: [id]
        })

        if (playlistRs.rows.length === 0) return c.json({ error: 'E_NOT_FOUND' }, 404)
        const playlist = playlistRs.rows[0]

        const tracksRs = await db.execute({
            sql: `
                SELECT t.*, a.name as artist_name
                FROM playlist_tracks pt
                JOIN tracks t ON pt.track_id = t.id
                LEFT JOIN artists a ON t.artist_id = a.id
                WHERE pt.playlist_id = ?
                ORDER BY pt.position ASC
            `,
            args: [id]
        })

        return c.json({
            ...playlist,
            tracks: tracksRs.rows
        })

    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}
