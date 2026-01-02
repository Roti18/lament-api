import { Context } from 'hono'
import { db } from '../config/db'

export const listPlaylistTracks = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM playlist_tracks LIMIT 100')
    return c.json(rs.rows)
}

export const addTrackToPlaylist = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { playlist_id, track_id } = await c.req.json()
        if (!playlist_id || !track_id) return c.json({ error: 'E_MISSING_FIELDS' }, 400)

        const playlistCheck = await db.execute({
            sql: "SELECT id FROM playlists WHERE id = ? AND user_id = ?",
            args: [playlist_id, user.sub]
        })
        if (playlistCheck.rows.length === 0) return c.json({ error: 'E_NOT_FOUND_OR_PERM' }, 404)

        const posRs = await db.execute({
            sql: "SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = ?",
            args: [playlist_id]
        })
        const nextPos = (posRs.rows[0].max_pos as number || 0) + 1

        await db.execute({
            sql: "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
            args: [playlist_id, track_id, nextPos]
        })

        return c.json({ success: true, playlist_id, track_id }, 201)

    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}

export const removeTrackFromPlaylist = async (c: Context) => {
    try {
        const user = c.get('jwtPayload')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const playlistId = c.req.query('playlist_id')
        const trackId = c.req.query('track_id')

        if (!playlistId || !trackId) return c.json({ error: 'E_MISSING_PARAMS' }, 400)

        const check = await db.execute({
            sql: "SELECT id FROM playlists WHERE id = ? AND user_id = ?",
            args: [playlistId, user.sub]
        })

        if (check.rows.length === 0) return c.json({ error: 'E_NOT_FOUND_OR_PERM' }, 404)

        await db.execute({
            sql: "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
            args: [playlistId, trackId]
        })

        return c.json({ success: true })

    } catch (e) {
        return c.json({ error: 'E_SERVER' }, 500)
    }
}
