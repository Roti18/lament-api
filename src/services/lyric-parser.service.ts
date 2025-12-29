export interface LyricLine {
    t: number;
    text: string;
    tokens?: { text: string, highlight?: boolean }[];
}

/**
 * Clean Genius-specific metadata and junk headers
 */
export function cleanGeniusContent(content: string, trackTitle?: string): string {
    // 1. Remove HTML tags (images, divs, etc)
    let cleaned = content.replace(/<[^>]+>/g, '');

    // 2. Remove "Read More" blocks
    if (/Read More/i.test(cleaned)) {
        cleaned = cleaned.replace(/^[\s\S]*?Read More(\s*\[.*?\])?/i, '');
    }

    // 3. Remove "X Contributors" and "Translations" block
    const contributorsRegex = /^\s*\d+\s*Contributors/i;
    if (contributorsRegex.test(cleaned)) {
        const lyricsMatch = cleaned.match(/Lyrics/);
        if (lyricsMatch && lyricsMatch.index && lyricsMatch.index < 500) {
            cleaned = cleaned.substring(lyricsMatch.index + 6);
        } else {
            cleaned = cleaned.replace(/^\s*\d+\s*Contributors.*$/im, '');
        }
    }

    // 4. Remove generic "Lyrics" header
    cleaned = cleaned.replace(/^.*Lyrics\s*$/m, '');

    // 5. Aggressively strip "Translations"
    cleaned = cleaned.replace(/^\s*Translations.*?$/m, '');

    // 6. Normalize newlines
    cleaned = cleaned.replace(/\r\n/g, '\n').trim();

    // 7. Remove Section Headers [Verse], [Chorus], etc.
    // The user wants strict cleaning: "Yang tersisa HANYA baris lirik murni"
    cleaned = cleaned.replace(/^\[.*?\]$/gm, '');

    // 8. Remove Song Title if it appears at the start (common in copy-pastes)
    if (trackTitle) {
        const titleRegex = new RegExp(`^${escapeRegExp(trackTitle)}$`, 'im');
        cleaned = cleaned.replace(titleRegex, '');
    }

    // Final trim to remove empty lines created by removals
    return cleaned.split('\n').filter(line => line.trim().length > 0).join('\n');
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenize text and highlight if matches title.
 */
function tokenizeWithHighlight(text: string, title?: string): { text: string, highlight?: boolean }[] {
    if (!title) return [{ text }];

    const escapedTitle = title.trim();
    if (!escapedTitle) return [{ text }];

    // Match whole word, case insensitive
    const regex = new RegExp(`\\b(${escapeRegExp(escapedTitle)})\\b`, 'gi');
    const parts = text.split(regex);
    const tokens: { text: string, highlight?: boolean }[] = [];

    for (const part of parts) {
        if (!part) continue;
        if (part.toLowerCase() === escapedTitle.toLowerCase()) {
            tokens.push({ text: part, highlight: true });
        } else {
            tokens.push({ text: part });
        }
    }
    return tokens;
}

/**
 * Parses a raw LRC string into a normalized array of objects.
 * RULES:
 * - t = milliseconds
 * - Ignore metadata ([ar:], [ti:], etc)
 * - Sort ASC by t
 * - If unsynced and durationMs provided, distribute lines proportionally.
 */
export function parseLRC(content: string, durationMs: number = 0, trackTitle?: string): { lines: LyricLine[], synced: boolean } {
    const cleanedContent = cleanGeniusContent(content, trackTitle);
    const lines: LyricLine[] = [];
    const rawLines = cleanedContent.split('\n');
    const timestampRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
    let hasAnyTimestamp = false;

    // First pass: try to parse timestamps
    for (let rawLine of rawLines) {
        rawLine = rawLine.trim();
        if (!rawLine) continue;

        // Skip metadata tags if they survived cleaning
        if (/^\[[a-z]+:.*\]$/i.test(rawLine)) continue;

        const timestamps: number[] = [];
        let match;
        let lastIndex = 0;
        timestampRegex.lastIndex = 0;

        while ((match = timestampRegex.exec(rawLine)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const millisecondsPart = match[3] || '00';
            let ms = 0;
            if (millisecondsPart.length === 2) ms = parseInt(millisecondsPart) * 10;
            else if (millisecondsPart.length === 3) ms = parseInt(millisecondsPart);
            else ms = parseInt(millisecondsPart.padEnd(3, '0').substring(0, 3));

            const totalMs = (minutes * 60 + seconds) * 1000 + ms;
            timestamps.push(totalMs);
            lastIndex = timestampRegex.lastIndex;
            hasAnyTimestamp = true;
        }

        if (timestamps.length > 0) {
            const text = rawLine.substring(lastIndex).trim();
            if (text) {
                const tokens = tokenizeWithHighlight(text, trackTitle);
                for (const t of timestamps) {
                    lines.push({ t, text, tokens });
                }
            }
        } else if (!hasAnyTimestamp) {
            // Collect potential plain lines for fallback
        }
    }

    // If we have timestamps, we are good.
    if (hasAnyTimestamp) {
        return {
            synced: true,
            lines: lines.sort((a, b) => a.t - b.t)
        };
    }

    // FALLBACK: Proportional Timing
    // User Requirement: "Distribusikan lyrics secara proporsional terhadap durasi track"
    // We use the cleaned lines.
    const plainLines = rawLines.map(l => l.trim()).filter(l => l.length > 0);

    if (plainLines.length === 0) {
        return { synced: false, lines: [] };
    }

    if (durationMs > 0) {
        // Simple linear distribution
        // Start after a small intro (e.g., 2s) and end before outro (e.g. duration - 5s)
        // Or just spaced evenly across the whole track.
        // Let's do evenly across 80% of track to be safe? 
        // Or just strict: 0 to duration.
        // Option recommended: normalized millisecond.
        const step = durationMs / (plainLines.length + 1);

        const estimatedLines = plainLines.map((text, i) => ({
            t: Math.floor(step * (i + 1)),
            text,
            tokens: tokenizeWithHighlight(text, trackTitle)
        }));

        return {
            synced: true, // We pretend it's synced so frontend uses the timing
            lines: estimatedLines
        };
    }

    // If no unique duration (or 0), we return t: -1
    return {
        synced: false,
        lines: plainLines.map(text => ({
            t: -1,
            text,
            tokens: tokenizeWithHighlight(text, trackTitle)
        }))
    };
}
