export interface LyricLine {
    t: number;
    text: string;
}

/**
 * Parses a raw LRC string into a normalized array of objects.
 * RULES:
 * - t = milliseconds
 * - Ignore metadata ([ar:], [ti:], etc)
 * - Ignore baris invalid
 * - Handle multiple timestamps in 1 line
 * - Sort ASC by t
 */
export function parseLRC(content: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const rawLines = content.split(/\r?\n/);

    // Regex to match timestamps like [00:12.50] or [01:02] or [01:02:03]
    // We look for all occurrences of [mm:ss.xx] at the start of a line segment
    const timestampRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;

    for (let rawLine of rawLines) {
        rawLine = rawLine.trim();
        if (!rawLine) continue;

        // Check for metadata tags like [ar:Artist], [ti:Title], etc.
        // These tags usually have a colon after a few letters and before the closing bracket.
        if (/^\[[a-z]+:.*\]$/i.test(rawLine)) continue;

        const timestamps: number[] = [];
        let match;
        let lastIndex = 0;

        // Reset regex state since we use global flag
        timestampRegex.lastIndex = 0;

        while ((match = timestampRegex.exec(rawLine)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const millisecondsPart = match[3] || '00';

            // Handle the fractional seconds (xx in [mm:ss.xx])
            // It can be 2 digits (centiseconds) or 3 digits (milliseconds)
            let ms = 0;
            if (millisecondsPart.length === 2) {
                ms = parseInt(millisecondsPart) * 10;
            } else if (millisecondsPart.length === 3) {
                ms = parseInt(millisecondsPart);
            } else {
                ms = parseInt(millisecondsPart.padEnd(3, '0').substring(0, 3));
            }

            const totalMs = (minutes * 60 + seconds) * 1000 + ms;
            timestamps.push(totalMs);
            lastIndex = timestampRegex.lastIndex;
        }

        if (timestamps.length > 0) {
            // The text is what remains after all timestamps
            const text = rawLine.substring(lastIndex).trim();

            // Even if text is empty (instrumental break label maybe), we might want to keep it
            // but usually we only want lines with actual words for display.
            // For now, let's keep it if it's strictly defined by the timestamp.
            for (const t of timestamps) {
                lines.push({ t, text });
            }
        }
    }

    // Sort ASC by time
    return lines.sort((a, b) => a.t - b.t);
}
