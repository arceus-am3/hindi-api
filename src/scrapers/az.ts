import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl, extractPagination } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { CategoryData, AnimeInfo } from '../types';

/**
 * Scrape A-Z content by letter
 */
export async function scrapeAZ(letter: string, page: number = 1): Promise<CategoryData> {
    // Normalize letter
    const normalizedLetter = letter.toUpperCase();

    // Handle '0-9' or 'numeric' case if needed, though site usually has '0-9' as a specific route or '#'
    const routeLetter = normalizedLetter === '#' || normalizedLetter === '0-9' ? '0-9' : normalizedLetter;

    const cacheKey = generateCacheKey('az', routeLetter, page);

    // Check cache
    const cached = cache.get<CategoryData>(cacheKey);
    if (cached) {
        return cached;
    }

    // Correct URL structure based on site inspection
    // Pattern: https://watchanimeworld.in/letter/A/page/2/
    const url = page > 1
        ? `${config.baseUrl}/letter/${routeLetter}/page/${page}/`
        : `${config.baseUrl}/letter/${routeLetter}/`;

    const html = await fetchHtml(url);
    const $ = loadHtml(html);

    const results: AnimeInfo[] = [];

    $('article.post').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const title = cleanText(link.attr('title') || $el.find('.post-title, h2, h3').text() || '');
        const itemUrl = normalizeUrl(link.attr('href') || '');
        const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

        if (title && itemUrl) {
            const id = extractIdFromUrl(itemUrl);
            const type = itemUrl.includes('/series/') ? 'series' : 'movie';

            // Try to extract year and languages if visible on cards
            const langText = $el.text().toLowerCase();
            const language: string[] = [];
            if (langText.includes('hindi')) language.push('Hindi');
            if (langText.includes('tamil')) language.push('Tamil');
            if (langText.includes('telugu')) language.push('Telugu');
            if (langText.includes('english')) language.push('English');

            results.push({
                id,
                title,
                poster: normalizeUrl(poster),
                url: itemUrl,
                type,
                language: language.length > 0 ? language : undefined
            });
        }
    });

    const pagination = extractPagination($, page);

    const data: CategoryData = {
        success: true,
        category: `az-${routeLetter}`,
        results,
        pagination
    };

    cache.set(cacheKey, data, config.cache.ttl.category);

    return data;
}
