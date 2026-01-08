import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl, extractPagination } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { CategoryData, AnimeInfo } from '../types';

/**
 * Scrape category page (anime, cartoon, movies, series)
 */
export async function scrapeCategory(category: string, page: number = 1): Promise<CategoryData> {
    const cacheKey = generateCacheKey('category', category, page);

    // Check cache
    const cached = cache.get<CategoryData>(cacheKey);
    if (cached) {
        return cached;
    }

    let url: string;

    // Build URL based on category type
    if (category === 'anime' || category === 'cartoon') {
        url = `${config.baseUrl}/category/${category}/page/${page}/`;
    } else if (category === 'movies') {
        url = `${config.baseUrl}/movies/page/${page}/`;
    } else if (category === 'series') {
        url = `${config.baseUrl}/series/page/${page}/`;
    } else {
        // Generic category
        url = `${config.baseUrl}/category/${category}/page/${page}/`;
    }

    const html = await fetchHtml(url);
    const $ = loadHtml(html);

    const results: AnimeInfo[] = [];

    // Extract category items using correct selector
    $('article.post').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const title = cleanText(link.attr('title') || $el.find('.post-title, h2, h3').text() || '');
        const itemUrl = normalizeUrl(link.attr('href') || '');
        const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

        if (title && itemUrl) {
            const id = extractIdFromUrl(itemUrl);
            const type = itemUrl.includes('/series/') ? 'series' : 'movie';

            // Try to extract year
            const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? yearMatch[0] : undefined;

            // Try to extract language
            const language: string[] = [];
            const langText = $el.text().toLowerCase();
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
                year,
                language: language.length > 0 ? language : undefined,
            });
        }
    });

    // Extract pagination
    const pagination = extractPagination($, page);

    const categoryData: CategoryData = {
        success: true,
        category,
        results,
        pagination,
    };

    // Cache the result
    cache.set(cacheKey, categoryData, config.cache.ttl.category);

    return categoryData;
}

/**
 * Scrape category filtered by language
 */
export async function scrapeCategoryByLanguage(language: string, page: number = 1): Promise<CategoryData> {
    const cacheKey = generateCacheKey('category-lang', language, page);

    // Check cache
    const cached = cache.get<CategoryData>(cacheKey);
    if (cached) {
        return cached;
    }

    // Use the specific language category URL
    // e.g. https://watchanimeworld.in/category/language/hindi/
    const categoryPath = `language/${language.toLowerCase()}`;
    const result = await scrapeCategory(categoryPath, page);

    const categoryData: CategoryData = {
        success: true,
        category: `language-${language}`,
        results: result.results,
        pagination: result.pagination,
    };

    // Cache the result
    cache.set(cacheKey, categoryData, config.cache.ttl.category);

    return categoryData;
}
