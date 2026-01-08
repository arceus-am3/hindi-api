import { config } from '../config';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class Cache {
    private store: Map<string, CacheEntry<any>> = new Map();

    /**
     * Get cached data if it exists and is not expired
     */
    get<T>(key: string): T | null {
        const entry = this.store.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            // Cache expired, remove it
            this.store.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cache data with TTL
     */
    set<T>(key: string, data: T, ttl: number): void {
        this.store.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Delete cache entry
     */
    delete(key: string): void {
        this.store.delete(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.store.size;
    }

    /**
     * Clean expired entries
     */
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.store.delete(key);
            }
        }
    }
}

// Export singleton instance
export const cache = new Cache();

// Start automatic cleanup
setInterval(() => {
    cache.cleanExpired();
}, 60 * 1000);

/**
 * Generate cache key from parts
 */
export function generateCacheKey(...parts: (string | number)[]): string {
    return parts.join(':');
}
