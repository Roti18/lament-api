import 'dotenv/config'
import { db } from "../config/db"

// Separators to split artist names
const SEPARATORS = /\s*[,&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+/i

const run = async () => {
    console.log("[INFO] Starting Artist Normalization...")

    try {
        // 1. Get all tracks with their current artist links
        const tracksRes = await db.execute(`
            SELECT t.id as track_id, a.id as artist_id, a.name as artist_name
            FROM tracks t
            JOIN track_artists ta ON ta.track_id = t.id
            JOIN artists a ON a.id = ta.artist_id
        `)

        const trackArtists = tracksRes.rows as any[]
        console.log(`[INFO] Found ${trackArtists.length} track-artist relationships to check`)

        let normalizedCount = 0

        for (const ta of trackArtists) {
            const names = ta.artist_name.split(SEPARATORS).map((n: string) => n.trim()).filter((n: string) => n.length > 0)

            // Skip if already single artist
            if (names.length <= 1) continue

            console.log(`[SPLIT] "${ta.artist_name}" -> [${names.join(', ')}]`)

            for (const name of names) {
                // Check if individual artist exists
                let artistRes = await db.execute({ sql: 'SELECT id FROM artists WHERE name = ?', args: [name] })
                let artistId: string

                if (artistRes.rows.length === 0) {
                    // Create new artist
                    artistId = crypto.randomUUID()
                    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    await db.execute({ sql: 'INSERT INTO artists (id, name, slug) VALUES (?, ?, ?)', args: [artistId, name, slug] })
                    console.log(`  [NEW] Created artist: ${name} (${artistId})`)
                } else {
                    artistId = (artistRes.rows[0] as any).id
                }

                // Link track to individual artist (if not already linked)
                const existingLink = await db.execute({
                    sql: 'SELECT 1 FROM track_artists WHERE track_id = ? AND artist_id = ?',
                    args: [ta.track_id, artistId]
                })

                if (existingLink.rows.length === 0) {
                    await db.execute({
                        sql: 'INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)',
                        args: [ta.track_id, artistId]
                    })
                    console.log(`  [LINK] Track ${ta.track_id} -> Artist ${name}`)
                }
            }

            // Remove the old combined artist link
            await db.execute({
                sql: 'DELETE FROM track_artists WHERE track_id = ? AND artist_id = ?',
                args: [ta.track_id, ta.artist_id]
            })
            console.log(`  [UNLINK] Removed combined artist link`)

            normalizedCount++
        }

        console.log(`\n[INFO] Normalization completed. ${normalizedCount} tracks normalized.`)
        console.log("[INFO] Note: Combined artists not deleted to preserve album references.")
        process.exit(0)
    } catch (error) {
        console.error("[ERROR] Normalization failed:", error)
        process.exit(1)
    }
}

run()
