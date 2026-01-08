import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { HomeData, AnimeInfo } from '../types';

/**
 * Scrape home page data
 */
export async function scrapeHome(): Promise<HomeData> {
    const cacheKey = generateCacheKey('home');

    // Check cache
    const cached = cache.get<HomeData>(cacheKey);
    if (cached) {
        return cached;
    }

    const html = await fetchHtml(config.baseUrl);
    const $ = loadHtml(html);

    const homeData: HomeData = {
        latestSeries: [],
        latestMovies: [],
        trending: [],
        popular: [],
        featured: [],
    };

    // 1. Latest Episodes / "Newest Drops"
    $('.latest-ep-swiper-slide').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.lnk-blk').first();
        const title = cleanText($el.find('.entry-title').text());
        const url = normalizeUrl(link.attr('href') || '');
        const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

        if (title && url) {
            homeData.latestSeries.push({
                id: extractIdFromUrl(url),
                title,
                poster: normalizeUrl(poster),
                url,
                type: 'series' // Usually series have episodes
            });
        }
    });

    // 2. Latest Movies / "Latest Anime Movies"
    $('#widget_list_movies_series-4 .latest-movies-series-swiper-slide').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.lnk-blk').first();
        const title = cleanText($el.find('.entry-title').text());
        const url = normalizeUrl(link.attr('href') || '');
        const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

        if (title && url) {
            homeData.latestMovies.push({
                id: extractIdFromUrl(url),
                title,
                poster: normalizeUrl(poster),
                url,
                type: 'movie'
            });
        }
    });

    // 3. Trending / Popular (Most Watched Shows - #torofilm_wdgt_popular-3)
    $('#torofilm_wdgt_popular-3 .top-picks__item').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.item__card').first();
        const url = normalizeUrl(link.attr('href') || '');
        // The title might be alt text of image or missing, let's try image alt
        const img = $el.find('img').first();
        const poster = img.attr('src') || img.attr('data-src') || '';
        let title = cleanText(img.attr('alt') || '');

        // Clean "Image " prefix often found in alt text
        title = title.replace(/^Image\s+/i, '');

        if (url) {
            homeData.popular.push({
                id: extractIdFromUrl(url),
                title,
                poster: normalizeUrl(poster),
                url,
                type: 'series'
            });
        }
    });

    // 4. Trending Movies (Most Watched Films - #torofilm_wdgt_popular-5)
    $('#torofilm_wdgt_popular-5 .top-picks__item').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.item__card').first();
        const url = normalizeUrl(link.attr('href') || '');
        const img = $el.find('img').first();
        const poster = img.attr('src') || img.attr('data-src') || '';
        let title = cleanText(img.attr('alt') || '');
        title = title.replace(/^Image\s+/i, '');

        if (url) {
            homeData.trending.push({
                id: extractIdFromUrl(url),
                title,
                poster: normalizeUrl(poster),
                url,
                type: 'movie'
            });
        }
    });

    // Fallback for featured/generic if needed, but the above covers specific sections better.
    // Let's populate featured from popular for now if empty
    if (homeData.featured?.length === 0) {
        homeData.featured = [...homeData.popular.slice(0, 5)];
    }

    // Remove duplicates and limit results
    homeData.latestSeries = removeDuplicates(homeData.latestSeries).slice(0, 20);
    homeData.latestMovies = removeDuplicates(homeData.latestMovies).slice(0, 20);
    homeData.trending = removeDuplicates(homeData.trending || []).slice(0, 10);
    homeData.popular = removeDuplicates(homeData.popular || []).slice(0, 10);
    homeData.featured = removeDuplicates(homeData.featured || []).slice(0, 5);

    // Cache the result
    cache.set(cacheKey, homeData, config.cache.ttl.home);

    return homeData;
}

/**
 * Remove duplicate anime entries by ID
 */
function removeDuplicates(items: AnimeInfo[]): AnimeInfo[] {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.id)) {
            return false;
        }
        seen.add(item.id);
        return true;
    });
}
