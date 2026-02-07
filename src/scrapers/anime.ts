import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl, parseEpisodeNumber } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { AnimeDetails, Season, Episode, AnimeInfo } from '../types';

/**
 * Scrape anime/series details
 */
export async function scrapeAnimeDetails(id: string): Promise<AnimeDetails> {
    const cacheKey = generateCacheKey('anime', id);

    // Check cache
    const cached = cache.get<AnimeDetails>(cacheKey);
    if (cached) {
        return cached;
    }

    const url = `${config.baseUrl}/series/${id}/`;
    const html = await fetchHtml(url);
    const $ = loadHtml(html);

    // Extract basic info
    const title = cleanText($('h1.title, .single-post h1, article h1').first().text());
    const poster = normalizeUrl($('.poster img, .thumbnail img, article img').first().attr('src') || '');
    const description = cleanText($('.description, .summary, .content p').first().text() || $('.content').first().text());

    // Extract genres
    const genres: string[] = [];
    $('.genres a, .genre a, .sgeneros a, a[rel="tag"]').each((_, el) => {
        const genre = cleanText($(el).text());
        if (genre && !genres.includes(genre)) {
            genres.push(genre);
        }
    });

    // Extract languages
    const languages: string[] = [];
    $('.languages a, .language a, .audio a').each((_, el) => {
        const lang = cleanText($(el).text());
        if (lang && !languages.includes(lang)) {
            languages.push(lang);
        }
    });

    // If no languages found, try to detect from content
    if (languages.length === 0) {
        const contentText = $.text().toLowerCase();
        if (contentText.includes('hindi')) languages.push('Hindi');
        if (contentText.includes('tamil')) languages.push('Tamil');
        if (contentText.includes('telugu')) languages.push('Telugu');
        if (contentText.includes('english')) languages.push('English');
    }

    // Extract rating
    const rating = cleanText($('.rating, .vote_average, .dt_rating_vgs').first().text());

    // Extract status
    const status = cleanText($('.status, .data .status').first().text());

    // Extract Seasons and Episodes
 // ===============================
// SEASONS & EPISODES (FIXED)
// watchanimeworld.net
// ===============================
const seasons: Season[] = [];
const episodes: Episode[] = [];

const episodeList = $('#episode_by_temp li');

episodeList.each((_, el) => {
  const $el = $(el);
  const link = $el.find('a').first();

  const epUrl = normalizeUrl(link.attr('href') || '');
  const label = cleanText(link.text()); // ex: "1x12"

  const match = label.match(/(\d+)x(\d+)/i);
  const episodeNumber = match ? parseInt(match[2]) : episodes.length + 1;

  if (epUrl) {
    episodes.push({
      id: extractIdFromUrl(epUrl),
      title: `Episode ${episodeNumber}`,
      episodeNumber,
      seasonNumber: 1,
      url: epUrl,
      thumbnail: ''
    });
  }
});

if (episodes.length > 0) {
  seasons.push({
    seasonNumber: 1,
    episodes
  });
}
    
                } catch (e) {
                    console.error(`Failed to fetch season ${seasonNum} for anime ${id}:`, e);
                }
            }
        }
    } else {
        // Single season or static list
        const episodes: Episode[] = [];
        const episodeList = $('#episode_by_temp li, .episodes-list li, #seasons .se-c .se-a li');

        episodeList.each((_, el) => {
            const $el = $(el);
            let link = $el.find('a.lnk-blk').first();
            if (link.length === 0) link = $el.find('a').first();

            const epUrl = normalizeUrl(link.attr('href') || '');
            const epPoster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
            let epTitle = cleanText($el.find('.entry-title').text() || link.attr('title') || '');

            const numText = $el.find('.num-epi').text();
            // Try numText first, then title
            const { episode, season } = parseEpisodeNumber(numText || epTitle);

            if (epUrl) {
                episodes.push({
                    id: extractIdFromUrl(epUrl),
                    title: epTitle,
                    episodeNumber: episode,
                    seasonNumber: season,
                    url: epUrl,
                    thumbnail: normalizeUrl(epPoster)
                });
            }
        });

        if (episodes.length > 0) {
            seasons.push({
                seasonNumber: 1,
                episodes: episodes
            });
        }
    }

    // Sort seasons
    seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

    // Calculate total episodes
    const totalEpisodes = seasons.reduce((sum, season) => sum + season.episodes.length, 0);

    // Extract related anime
    const related: AnimeInfo[] = [];
    $('.related article, .recommendations article, [class*="related"] article').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const relatedTitle = cleanText(link.attr('title') || link.text() || '');
        const relatedUrl = normalizeUrl(link.attr('href') || '');
        const relatedPoster = normalizeUrl($el.find('img').first().attr('src') || '');

        if (relatedTitle && relatedUrl) {
            const relatedId = extractIdFromUrl(relatedUrl);
            related.push({
                id: relatedId,
                title: relatedTitle,
                poster: relatedPoster,
                url: relatedUrl,
                type: relatedUrl.includes('/series/') ? 'series' : 'movie',
            });
        }
    });

    const animeDetails: AnimeDetails = {
        id,
        title,
        poster,
        url,
        description,
        genres,
        languages,
        rating: rating || undefined,
        status: status || undefined,
        totalEpisodes,
        seasons: seasons.length > 0 ? seasons : undefined,
        related: related.length > 0 ? related : undefined,
        type: 'series',
    };

    // Cache the result
    cache.set(cacheKey, animeDetails, config.cache.ttl.anime);

    return animeDetails;
}

/**
 * Scrape movie details (similar to anime but for movies)
 */
export async function scrapeMovieDetails(id: string): Promise<AnimeDetails> {
    const cacheKey = generateCacheKey('movie', id);

    // Check cache
    const cached = cache.get<AnimeDetails>(cacheKey);
    if (cached) {
        return cached;
    }

    const url = `${config.baseUrl}/movies/${id}/`;
    const html = await fetchHtml(url);
    const $ = loadHtml(html);

    // Extract basic info (similar to series)
    const title = cleanText($('h1.title, .single-post h1, article h1').first().text());
    const poster = normalizeUrl($('.poster img, .thumbnail img, article img').first().attr('src') || '');
    const description = cleanText($('.description, .summary, .content p').first().text() || $('.content').first().text());

    // Extract genres
    const genres: string[] = [];
    $('.genres a, .genre a, .sgeneros a, a[rel="tag"]').each((_, el) => {
        const genre = cleanText($(el).text());
        if (genre && !genres.includes(genre)) {
            genres.push(genre);
        }
    });

    // Extract languages
    const languages: string[] = [];
    $('.languages a, .language a, .audio a').each((_, el) => {
        const lang = cleanText($(el).text());
        if (lang && !languages.includes(lang)) {
            languages.push(lang);
        }
    });

    if (languages.length === 0) {
        const contentText = $.text().toLowerCase();
        if (contentText.includes('hindi')) languages.push('Hindi');
        if (contentText.includes('tamil')) languages.push('Tamil');
        if (contentText.includes('telugu')) languages.push('Telugu');
        if (contentText.includes('english')) languages.push('English');
    }

    const rating = cleanText($('.rating, .vote_average, .dt_rating_vgs').first().text());

    // Extract related movies
    const related: AnimeInfo[] = [];
    $('.related article, .recommendations article, [class*="related"] article').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        const relatedTitle = cleanText(link.attr('title') || link.text() || '');
        const relatedUrl = normalizeUrl(link.attr('href') || '');
        const relatedPoster = normalizeUrl($el.find('img').first().attr('src') || '');

        if (relatedTitle && relatedUrl) {
            const relatedId = extractIdFromUrl(relatedUrl);
            related.push({
                id: relatedId,
                title: relatedTitle,
                poster: relatedPoster,
                url: relatedUrl,
                type: relatedUrl.includes('/series/') ? 'series' : 'movie',
            });
        }
    });

    const movieDetails: AnimeDetails = {
        id,
        title,
        poster,
        url,
        description,
        genres,
        languages,
        rating: rating || undefined,
        related: related.length > 0 ? related : undefined,
        type: 'movie',
    };

    // Cache the result
    cache.set(cacheKey, movieDetails, config.cache.ttl.anime);

    return movieDetails;
}
