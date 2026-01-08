export const config = {
    // Base URL for watchanimeworld.in
    baseUrl: 'https://watchanimeworld.in',

    // Cache settings
    cache: {
        enabled: true,
        ttl: {
            home: 5 * 60 * 1000, // 5 minutes
            search: 10 * 60 * 1000, // 10 minutes
            anime: 30 * 60 * 1000, // 30 minutes
            episode: 60 * 60 * 1000, // 1 hour
            category: 15 * 60 * 1000, // 15 minutes
        }
    },

    // Server settings
    server: {
        port: 3001,
        host: '0.0.0.0',
    },

    // Request settings
    request: {
        timeout: 30000, // 30 seconds
        maxRetries: 3,
        retryDelay: 1000, // 1 second
    },

    // Default headers for requests
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
    },

    // User agents for rotation
    userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
};
