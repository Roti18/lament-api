import 'dotenv/config'
import { db } from "../config/db"

const run = async () => {
    // Check artists with Taylor or Bon in name
    const r = await db.execute("SELECT id, name FROM artists WHERE name LIKE '%Taylor%' OR name LIKE '%Bon%'")
    console.log("=== Artists with Taylor or Bon ===")
    console.log(JSON.stringify(r.rows, null, 2))

    // Check tracks with no artists in track_artists
    const orphans = await db.execute(`
        SELECT t.id, t.title, t.artist_id, a.name as old_artist_name
        FROM tracks t
        LEFT JOIN artists a ON a.id = t.artist_id
        LEFT JOIN track_artists ta ON ta.track_id = t.id
        WHERE ta.track_id IS NULL
        LIMIT 20
    `)
    console.log("\n=== Tracks with NO entries in track_artists ===")
    console.log(JSON.stringify(orphans.rows, null, 2))

    process.exit(0)
}
run()
