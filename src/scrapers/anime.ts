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
  const cached = cache.get<AnimeDetails>(cacheKey);
  if (cached) return cached;

  const url = `${config.baseUrl}/series/${id}/`;
  const html = await fetchHtml(url);
  const $ = loadHtml(html);

  // ================= BASIC INFO =================
  const title = cleanText($('h1').first().text());
  const poster = normalizeUrl($('article img').first().attr('src') || '');
  const description = cleanText($('.content').first().text());

  // ================= GENRES =================
  const genres: string[] = [];
  $('a[rel="tag"]').each((_, el) => {
    const g = cleanText($(el).text());
    if (g) genres.push(g);
  });

  // ================= LANGUAGES =================
  const languages: string[] = [];
  const text = $.text().toLowerCase();
  if (text.includes('hindi')) languages.push('Hindi');
  if (text.includes('tamil')) languages.push('Tamil');
  if (text.includes('telugu')) languages.push('Telugu');
  if (text.includes('english')) languages.push('English');

  // ================= SEASONS & EPISODES =================
  const episodes: Episode[] = [];

  $('#episode_by_temp li').each((_, el) => {
    const link = $(el).find('a').first();
    const epUrl = normalizeUrl(link.attr('href') || '');
    const label = cleanText(link.text()); // "1x12"

    const match = label.match(/(\d+)x(\d+)/i);
    const episodeNumber = match ? Number(match[2]) : episodes.length + 1;

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

  const seasons: Season[] = episodes.length
    ? [{ seasonNumber: 1, episodes }]
    : [];

  const totalEpisodes = episodes.length;

  // ================= RELATED =================
  const related: AnimeInfo[] = [];
  $('.related article').each((_, el) => {
    const link = $(el).find('a').first();
    const rUrl = normalizeUrl(link.attr('href') || '');
    if (!rUrl) return;

    related.push({
      id: extractIdFromUrl(rUrl),
      title: cleanText(link.text()),
      poster: normalizeUrl($(el).find('img').attr('src') || ''),
      url: rUrl,
      type: rUrl.includes('/series/') ? 'series' : 'movie'
    });
  });

  const animeDetails: AnimeDetails = {
    id,
    title,
    poster,
    url,
    description,
    genres,
    languages,
    totalEpisodes,
    seasons,
    related,
    type: 'series'
  };

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
