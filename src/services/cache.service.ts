import { LRUCache } from 'lru-cache';

// Initialize LRU Cache (In-Memory Fallback)
// Options: max 500 items, 24h TTL (matching typical lyric usage)
const lruClient = new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    allowStale: false,
});

console.log("[Cache] Using In-Memory LRU Cache (Redis removed).");

export const CacheService = {
    /**
     * Get data from cache. 
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            return (lruClient.get(key) as T) || null;
        } catch (err) {
            console.error(`[Cache] Error getting key ${key}:`, err);
            return null;
        }
    },

    /**
     * Set data to cache.
     */
    async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
        try {
            lruClient.set(key, value, { ttl: ttlSeconds * 1000 });
        } catch (err) {
            console.error(`[Cache] Error setting key ${key}:`, err);
        }
    },

    /**
     * Delete key from cache.
     */
    async del(key: string): Promise<void> {
        try {
            lruClient.delete(key);
        } catch (err) {
            console.error(`[Cache] Error deleting key ${key}:`, err);
        }
    },

    /**
     * Simple Rate Limiter
     * Returns true if limited.
     */
    async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
        const rateKey = `ratelimit:${key}`;
        try {
            const current = lruClient.get(rateKey) as number || 0;
            if (current >= limit) return true;

            // Increment
            // Note: LRU update resets TTL usually, but for simple limiting we can just set it.
            // If we want fixed window, we only set TTL on first write.
            if (current === 0) {
                lruClient.set(rateKey, 1, { ttl: windowSeconds * 1000 });
            } else {
                // Check remaining TTL to preserve window? 
                // lru-cache gets complicated. simpler: just simple sliding/fixed.
                // let's just increment and keep original TTL if possible, or reset.
                // For now, simpler: Reset TTL on every hit (Sliding Window) or strict?
                // Let's do: Set with same TTL? No that extends it.
                // We will verify strictness later. For now, simple counter.
                const ttl = lruClient.getRemainingTTL(rateKey);
                lruClient.set(rateKey, current + 1, { ttl });
            }
            return false;
        } catch (err) {
            return false; // Fail open
        }
    }
};
