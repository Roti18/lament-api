import 'dotenv/config'; // Load env vars
import { createClient } from '@libsql/client';
import { CacheService } from '../services/cache.service';
import { parseLRC, cleanGeniusContent } from '../services/lyric-parser.service';
// import { Lyric } from '../lib/types'; <--- Removed

// Setup DB
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Setup Redis: Removed in favor of unified CacheService

async function globalResync() {
    console.log("Starting Global Lyrics Re-Sync...");

    try {
        // 1. Fetch all Lyrics + Track Info
        // We need track duration and title for parsing
        const query = `
            SELECT l.id, l.track_id, l.variant, l.content, t.title as track_title, t.duration
            FROM lyrics l
            JOIN tracks t ON l.track_id = t.id
        `;

        const rs = await db.execute(query);
        const rows = rs.rows;
        console.log(`Found ${rows.length} lyric entries.`);

        let updatedCount = 0;

        for (const row of rows) {
            const durationMs = (row.duration as number || 0) * 1000;
            const trackTitle = row.track_title as string;
            const content = row.content as string;
            const variant = row.variant as string;
            const trackId = row.track_id as string;
            const lyricId = row.id as string;

            // 2. Clean Content (Consolidated Logic)
            // We use the new cleanGeniusContent which strips headers/titles
            const cleanedContent = cleanGeniusContent(content, trackTitle);

            // 3. Update DB with Cleaned Content if different
            if (cleanedContent !== content) {
                await db.execute({
                    sql: "UPDATE lyrics SET content = ? WHERE id = ?",
                    args: [cleanedContent, lyricId]
                });
                updatedCount++;
            }

            // 4. Parse / Normalize / Estimate Timing
            const { lines, synced } = parseLRC(cleanedContent, durationMs, trackTitle);

            // 5. Update Cache (Normalized Data) via CacheService
            const cacheKey = `lyrics:${trackId}:${variant}`;
            const cacheData = {
                variant: variant,
                lines: lines,
                synced: synced
            };
            // Cache for 24h
            await CacheService.set(cacheKey, cacheData, 24 * 60 * 60);
        }

        console.log("\n==================================");
        console.log("RE-SYNC COMPLETE");
        console.log(`Processed: ${rows.length}`);
        console.log(`DB Updated: ${updatedCount}`);
        console.log(`Cache Updated: YES (via CacheService)`);
        console.log("==================================");

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

globalResync();
