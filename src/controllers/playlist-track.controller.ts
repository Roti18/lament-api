import { Context } from 'hono'
import { db } from '../config/db'

export const listPlaylistTracks = async (c: Context) => {
    const rs = await db.execute('SELECT * FROM playlist_tracks')
    return c.json(rs.rows)
}
