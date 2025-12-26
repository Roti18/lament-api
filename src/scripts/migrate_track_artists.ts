import 'dotenv/config'
import { db } from "../config/db"

const run = async () => {
    console.log("[INFO] Starting Track-Artists Migration...")
    try {
        // 1. Create Table
        console.log("[EXEC] Creating table track_artists...")
        await db.execute(`
            CREATE TABLE IF NOT EXISTS track_artists (
                track_id TEXT NOT NULL,
                artist_id TEXT NOT NULL,
                PRIMARY KEY (track_id, artist_id),
                FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
                FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
            )
        `)

        // 2. Migrate Data
        console.log("[EXEC] Migrating existing track artists...")
        // Get all tracks that have artist_id
        const tracks = await db.execute("SELECT id, artist_id FROM tracks WHERE artist_id IS NOT NULL")

        let count = 0
        for (const row of tracks.rows as any[]) {
            // Check if exists to avoid duplicates if re-run
            const check = await db.execute({
                sql: "SELECT 1 FROM track_artists WHERE track_id = ? AND artist_id = ?",
                args: [row.id, row.artist_id]
            })

            if (check.rows.length === 0) {
                await db.execute({
                    sql: "INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)",
                    args: [row.id, row.artist_id]
                })
                count++
            }
        }

        console.log(`[INFO] Migration completed. ${count} relationships created.`)
        process.exit(0)
    } catch (error) {
        console.error("[ERROR] Migration failed:", error)
        process.exit(1)
    }
}

run()
