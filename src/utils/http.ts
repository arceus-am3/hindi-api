import { config } from '../config';

const userAgents = config.userAgents;

function getRandomUserAgent(): string {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

const defaultHeaders = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
    'Referer': config.baseUrl + '/',
};

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = config.request.maxRetries): Promise<Response> {
    try {
        const headers = {
            ...defaultHeaders,
            'User-Agent': getRandomUserAgent(),
            ...(options.headers || {})
        };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok && res.status >= 500 && retries > 0) {
            console.warn(`Fetch failed with ${res.status}, retrying ${url} (${retries} left)...`);
            await new Promise(r => setTimeout(r, config.request.retryDelay));
            return fetchWithRetry(url, options, retries - 1);
        }
        return res;
    } catch (e: any) {
        if (retries > 0) {
            console.warn(`Fetch error: ${e.message}, retrying ${url} (${retries} left)...`);
            await new Promise(r => setTimeout(r, config.request.retryDelay));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw e;
    }
}

export const httpClient = {
    get: async (url: string, conf: any = {}) => {
        const res = await fetchWithRetry(url, { headers: conf.headers });
        if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
        }
        if (conf.responseType === 'stream') {
            return {
                // Bun's fetch body is a ReadableStream
                data: res.body,
                headers: Object.fromEntries((res.headers as any).entries()),
                status: res.status
            };
        }

        // Handle JSON automatically if content-type is json
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const json = await res.json();
            return { data: json, headers: Object.fromEntries((res.headers as any).entries()), status: res.status };
        }

        const text = await res.text();
        return { data: text, headers: Object.fromEntries((res.headers as any).entries()), status: res.status };
    }
};

export async function fetchHtml(url: string, headers: Record<string, string> = {}): Promise<string> {
    try {
        const res = await fetchWithRetry(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        return await res.text();
    } catch (error) {
        console.error(`Error fetching ${url}:`);
        console.error(error);
        throw error;
    }
}

export function buildUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${config.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}
