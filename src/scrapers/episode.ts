import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl, extractQuality, getVideoType } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { EpisodeDetails, VideoSource, DownloadLink, Server } from '../types';

/**
 * Scrape episode details and streaming sources
 */
export async function scrapeEpisode(id: string): Promise<EpisodeDetails> {
    const cacheKey = generateCacheKey('episode', id);

    // Check cache
    const cached = cache.get<EpisodeDetails>(cacheKey);
    if (cached) {
        return cached;
    }

    const url = `${config.baseUrl}/episode/${id}/`;
    const html = await fetchHtml(url);
    const $ = loadHtml(html);

    // Extract episode info
    const title = cleanText($('h1.title, .single-post h1, article h1').first().text());
    const thumbnail = normalizeUrl($('.thumbnail img, article img').first().attr('src') || '');

    // Try to parse episode/season numbers from title or URL
    let episodeNumber = 1;
    let seasonNumber = 1;

    const episodeMatch = id.match(/(\d+)x(\d+)/);
    if (episodeMatch) {
        seasonNumber = parseInt(episodeMatch[1]);
        episodeNumber = parseInt(episodeMatch[2]);
    } else {
        const epMatch = id.match(/episode-(\d+)/);
        if (epMatch) {
            episodeNumber = parseInt(epMatch[1]);
        }
    }

    // Extract video sources
    const sources: VideoSource[] = [];
    const servers: Server[] = [];

    // Look for iframe embeds (check data-src first, then src)
    $('iframe').each((_, el) => {
        const dataSrc = $(el).attr('data-src');
        const src = $(el).attr('src');
        const iframeSrc = dataSrc || src;

        if (iframeSrc) {
            const fullUrl = normalizeUrl(iframeSrc);
            sources.push({
                url: fullUrl,
                quality: 'auto',
                type: 'iframe',
                server: 'iframe',
            });
        }
    });

    // Look for video players
    $('.player-container, .video-player, [class*="player"]').each((_, el) => {
        const $el = $(el);

        // Check for data attributes
        const dataUrl = $el.attr('data-url') || $el.attr('data-src') || $el.attr('data-video');
        if (dataUrl) {
            sources.push({
                url: normalizeUrl(dataUrl),
                quality: 'auto',
                type: getVideoType(dataUrl),
            });
        }

        // Check for iframes inside (with data-src priority)
        $el.find('iframe').each((_, iframe) => {
            const dataSrc = $(iframe).attr('data-src');
            const src = $(iframe).attr('src');
            const iframeSrc = dataSrc || src;

            if (iframeSrc) {
                sources.push({
                    url: normalizeUrl(iframeSrc),
                    quality: 'auto',
                    type: 'iframe',
                });
            }
        });
    });

    // Look for server options
    $('.server-option, .player-option, [class*="server"]').each((_, el) => {
        const $el = $(el);
        const serverId = $el.attr('data-id') || $el.attr('data-server') || '';
        const serverName = cleanText($el.text());
        const serverUrl = $el.attr('data-url') || $el.attr('href') || '';

        if (serverId && serverName) {
            servers.push({
                id: serverId,
                name: serverName,
                url: normalizeUrl(serverUrl),
            });
        }
    });

    // Extract download links
    const downloads: DownloadLink[] = [];
    $('.download-link, .download-option, a[download], [class*="download"] a').each((_, el) => {
        const $el = $(el);
        const downloadUrl = $el.attr('href') || '';
        const text = cleanText($el.text());
        const quality = extractQuality(text);

        if (downloadUrl && downloadUrl.includes('http')) {
            downloads.push({
                url: downloadUrl,
                quality,
            });
        }
    });

    const episodeDetails: EpisodeDetails = {
        id,
        title,
        episodeNumber,
        seasonNumber,
        thumbnail,
        sources,
        downloads: downloads.length > 0 ? downloads : undefined,
        servers: servers.length > 0 ? servers : undefined,
    };

    // Cache the result
    cache.set(cacheKey, episodeDetails, config.cache.ttl.episode);

    return episodeDetails;
}

/**
 * Get specific server sources for an episode
 */
export async function getEpisodeServer(episodeId: string, serverId: string): Promise<VideoSource[]> {
    const cacheKey = generateCacheKey('episode-server', episodeId, serverId);

    // Check cache
    const cached = cache.get<VideoSource[]>(cacheKey);
    if (cached) {
        return cached;
    }

    // First get the episode details to find the server
    const episode = await scrapeEpisode(episodeId);

    if (!episode.servers) {
        return [];
    }

    const server = episode.servers.find(s => s.id === serverId);
    if (!server || !server.url) {
        return [];
    }

    // Fetch the server URL
    const html = await fetchHtml(server.url);
    const $ = loadHtml(html);

    const sources: VideoSource[] = [];

    // Extract sources from the server page
    $('iframe').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src) {
            sources.push({
                url: normalizeUrl(src),
                quality: 'auto',
                type: getVideoType(src),
                server: server.name,
            });
        }
    });

    // Cache the result
    cache.set(cacheKey, sources, config.cache.ttl.episode);

    return sources;
}
