import { fetchHtml, httpClient } from '../utils/http';
import { loadHtml, normalizeUrl, getVideoType } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { StreamData } from '../types';

/**
 * Unpack Dean Edwards packed code
 */
function unpack(packed: string): string {
    try {
        const match = packed.match(/return\s+p}\('(.+?)',(\d+),(\d+),'(.+?)'\.split\('\|'\),(\d+),({}|\[\])\)\)/);
        if (!match) return '';

        let [_, p, aStr, cStr, kStr, eStr, dStr] = match;
        const a = parseInt(aStr);
        const c = parseInt(cStr);
        const k = kStr.split('|');

        // Basic unpacking logic
        const e = (c: number): string => {
            return (c < a ? '' : e(Math.floor(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
        };

        // Fill missing keywords
        for (let i = 0; i < c; i++) {
            if (!k[i]) k[i] = e(i);
        }

        // Replace tokens
        // Using a simple regex replacement approach
        // Note: This is a simplified version and might not handle all edge cases
        return p.replace(/\b\w+\b/g, (w) => {
            const v = parseInt(w, 36);
            if (v < k.length && k[v]) return k[v];
            return w;
        });
    } catch (error) {
        console.error('Error unpacking code:', error);
        return '';
    }
}

/**
 * Extract stream URL from iframe embed
 */
export async function extractStreamUrl(iframeUrl: string, headers: Record<string, string> = { 'Referer': 'https://watchanimeworld.in/' }): Promise<string | null> {
    try {
        // Handle player1.php (WatchAnimeWorld API)
        if (iframeUrl.includes('player1.php') && iframeUrl.includes('data=')) {
            try {
                const urlObj = new URL(iframeUrl);
                const dataParam = urlObj.searchParams.get('data');
                if (dataParam) {
                    const decodedData = Buffer.from(dataParam, 'base64').toString('utf-8');
                    const sources = JSON.parse(decodedData);

                    // Try each source
                    for (const source of sources) {
                        if (source.link) {
                            // The link might be a short URL that redirects
                            // Pass Referer to bypass protection
                            const streamUrl = await extractStreamUrl(source.link, {
                                'Referer': 'https://watchanimeworld.in/',
                            });
                            if (streamUrl) return streamUrl;
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing player1.php data:', e);
            }
        }

        const html = await fetchHtml(iframeUrl, headers);
        const $ = loadHtml(html);

        // Look for m3u8 URLs in the HTML
        const scriptTags = $('script').toArray();

        for (const script of scriptTags) {
            const scriptContent = $(script).html() || '';

            // Look for m3u8 URLs (handling escaped slashes)
            const m3u8Match = scriptContent.match(/(https?:\\?\/\\?\/[^\s"']+\.m3u8[^\s"']*)/);
            if (m3u8Match) {
                return m3u8Match[1].replace(/\\/g, ''); // Remove escape slashes
            }

            // Look for mp4 URLs
            const mp4Match = scriptContent.match(/(https?:\\?\/\\?\/[^\s"']+\.mp4[^\s"']*)/);
            if (mp4Match) {
                return mp4Match[1].replace(/\\/g, '');
            }

            // Look for file: or source: properties
            const fileMatch = scriptContent.match(/["']?(?:file|source|src)["']?\s*:\s*["']([^"']+)["']/);
            if (fileMatch) {
                const url = fileMatch[1];
                if (url.startsWith('http') && !url.includes('demo.source') && !url.endsWith('.srt')) {
                    return url;
                }
            }

            // Handle ZephyrFlick / AbyssCDN packed code
            if (scriptContent.includes('eval(function(p,a,c,k,e,d)')) {
                const unpacked = unpack(scriptContent);
                if (unpacked) {
                    // Look for m3u8 in unpacked code (handling escaped slashes)
                    const m3u8Match = unpacked.match(/(https?:\\?\/\\?\/[^\s"']+\.m3u8[^\s"']*)/);
                    if (m3u8Match) {
                        return m3u8Match[1].replace(/\\/g, '');
                    }

                    // Look for sources array
                    // sources:[{file:"https://..."}]
                    const fileMatch = unpacked.match(/file["']?\s*:\s*["']([^"']+)["']/);
                    if (fileMatch) {
                        const url = fileMatch[1].replace(/\\/g, '');
                        if (url.startsWith('http') && !url.includes('demo.source') && !url.endsWith('.srt')) {
                            return url;
                        }
                    }
                }
            }
        }

        // Look for video tags
        const videoSrc = $('video source').first().attr('src') || $('video').first().attr('src');
        if (videoSrc) {
            return normalizeUrl(videoSrc);
        }

        // Look for iframes (nested)
        const nestedIframe = $('iframe').first().attr('src');
        if (nestedIframe && nestedIframe !== iframeUrl && !nestedIframe.startsWith('about:blank')) {
            // Recursively extract from nested iframe
            return await extractStreamUrl(normalizeUrl(nestedIframe));
        }

        return null;
    } catch (error) {
        console.error('Error extracting stream URL:', error);
        return null;
    }
}

/**
 * Get stream data for an episode
 */
/**
 * Get stream data for an episode
 */
export async function getStreamData(episodeId: string): Promise<StreamData> {
    const cacheKey = generateCacheKey('stream', episodeId);

    // Check cache
    const cached = cache.get<StreamData>(cacheKey);
    if (cached) {
        return cached;
    }

    // Import episode scraper
    const { scrapeEpisode } = await import('./episode');

    // Get episode details to find servers
    // episodeId might benefit from being the 'post' ID for AJAX calls
    const episode = await scrapeEpisode(episodeId);

    // If we have servers, we should try to fetch the player via AJAX for each
    if (episode.servers && episode.servers.length > 0) {
        for (const server of episode.servers) {
            try {
                // Prepare AJAX params
                const params = new URLSearchParams();
                params.append('action', 'doo_player_ajax');
                params.append('post', episodeId);
                params.append('nume', server.id); // server.id corresponds to 'nume' in doo_player_ajax
                params.append('type', 'tv'); // or 'movie', but usually 'tv' for episodes. Might need to detect.

                const response = await fetch(`${config.baseUrl}/wp-admin/admin-ajax.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: params
                });

                const data = await response.json(); // Usually returns JSON with {embed_url: "...", type: "iframe", ...}

                let playerUrl = '';
                if (data.embed_url) {
                    playerUrl = data.embed_url;
                } else if (data.content) {
                    // Sometimes content is HTML with iframe
                    const $ = loadHtml(data.content);
                    playerUrl = $('iframe').attr('src') || '';
                }

                if (playerUrl) {
                    // Now extract the actual stream from this player URL
                    const streamUrl = await extractStreamUrl(normalizeUrl(playerUrl));
                    if (streamUrl) {
                        const streamData: StreamData = {
                            success: true,
                            streamUrl,
                            type: getVideoType(streamUrl),
                            title: episode.title,
                            poster: episode.thumbnail
                        };
                        cache.set(cacheKey, streamData, config.cache.ttl.episode);
                        return streamData;
                    }
                }

            } catch (e) {
                console.error(`Error fetching player for server ${server.id}:`, e);
            }
        }
    }

    // Fallback: If no servers or AJAX fails, try the static sources from scrapeEpisode
    if (episode.sources && episode.sources.length > 0) {
        // Try to extract stream URL from iframe sources
        const iframeSources = episode.sources.filter(s => s.type === 'iframe');

        for (const source of iframeSources) {
            const streamUrl = await extractStreamUrl(source.url);

            if (streamUrl) {
                const streamData: StreamData = {
                    success: true,
                    streamUrl,
                    type: getVideoType(streamUrl),
                    title: episode.title,
                    poster: episode.thumbnail
                };
                cache.set(cacheKey, streamData, config.cache.ttl.episode);
                return streamData;
            }
        }

        // If no iframe, try direct sources
        const directSource = episode.sources.find(s => s.type === 'hls' || s.type === 'mp4');

        if (directSource) {
            const streamData: StreamData = {
                success: true,
                streamUrl: directSource.url,
                type: directSource.type,
                title: episode.title,
                poster: episode.thumbnail
            };
            cache.set(cacheKey, streamData, config.cache.ttl.episode);
            return streamData;
        }
    }

    return {
        success: false,
        streamUrl: '',
        type: 'none',
    };
}

/**
 * Proxy stream request (for CORS bypass)
 */
export async function proxyStream(streamUrl: string, headers?: Record<string, string>) {
    try {
        const response = await httpClient.get(streamUrl, {
            responseType: 'stream',
            headers: {
                ...headers,
                'Referer': config.baseUrl,
            },
        });

        return response;
    } catch (error) {
        console.error('Error proxying stream:', error);
        throw error;
    }
}
