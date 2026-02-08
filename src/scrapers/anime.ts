import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { AnimeDetails, Season, Episode, AnimeInfo } from '../types';
import fetch from 'node-fetch';

/* =========================
   FAST CHECK – next episode
   ========================= */
async function hasNewEpisode(
  id: string,
  season: number,
  episode: number
): Promise<boolean> {
  const nextUrl = `${config.baseUrl}/episode/${id}-${season}x${episode + 1}/`;

  const res = await fetch(nextUrl, {
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0',
      'range': 'bytes=0-0',
    },
  });

  return res.status === 200;
}

/* =========================
   MAIN SCRAPER
   ========================= */
export async function scrapeAnimeDetails(id: string): Promise<AnimeDetails> {
  const cacheKey = generateCacheKey('anime', id);

  /* ---------- SMART CACHE ---------- */
  const cached = cache.get<
    AnimeDetails & { _lastSeason?: number; _lastEpisode?: number }
  >(cacheKey);

  if (
    cached &&
    typeof cached._lastSeason === 'number' &&
    typeof cached._lastEpisode === 'number'
  ) {
    const updated = await hasNewEpisode(
      id,
      cached._lastSeason,
      cached._lastEpisode
    );

    if (!updated) {
      const { _lastSeason, _lastEpisode, ...publicData } = cached;
      return publicData;
    }

    if (typeof cache.delete === 'function') {
      cache.delete(cacheKey);
    }
  }

  /* ---------- BASIC PAGE ---------- */
  const url = `${config.baseUrl}/series/${id}/`;
  const html = await fetchHtml(url);
  const $ = loadHtml(html);

  const title = cleanText($('h1').first().text());
  const poster = normalizeUrl($('article img').first().attr('src') || '');
  const description = cleanText($('.content').first().text());

  /* ---------- GENRES ---------- */
  const genres: string[] = [];
  $('a[rel="tag"]').each((_, el) => {
    const g = cleanText($(el).text());
    if (g) genres.push(g);
  });

  /* ---------- LANGUAGES ---------- */
  const languages: string[] = [];
  const pageText = $.text().toLowerCase();
  if (pageText.includes('hindi')) languages.push('Hindi');
  if (pageText.includes('tamil')) languages.push('Tamil');
  if (pageText.includes('telugu')) languages.push('Telugu');
  if (pageText.includes('english')) languages.push('English');

  /* ---------- SEASONS & EPISODES (URL PATTERN – SAME AS BEFORE) ---------- */
  const seasons: Season[] = [];
  const MAX_SEASONS = 10;
  const MAX_EPISODES = 25;

  let lastSeason = 1;
  let lastEpisode = 0;
const startSeason =
  cached && typeof cached._lastSeason === 'number'
    ? cached._lastSeason
    : 1;

 for (let s = startSeason; s <= MAX_SEASONS; s++) {

    const episodes: Episode[] = [];

  const startEpisode =
  cached && s === cached._lastSeason
    ? cached._lastEpisode + 1
    : 1;

for (let e = startEpisode; e <= MAX_EPISODES; e++) {

      const epUrl = `${config.baseUrl}/episode/${id}-${s}x${e}/`;

      const res = await fetch(epUrl, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'range': 'bytes=0-0',
        },
      });

      if (res.status === 404) break;

      episodes.push({
        id: `${id}-${s}x${e}`,
        title: `Episode ${e}`,
        episodeNumber: e,
        seasonNumber: s,
        url: epUrl,
        thumbnail: '',
      });

      lastSeason = s;
      lastEpisode = e;
    }

    if (episodes.length > 0) {
      seasons.push({ seasonNumber: s, episodes });
    } else {
      break;
    }
  }

  const totalEpisodes = seasons.reduce(
    (sum, s) => sum + s.episodes.length,
    0
  );

  /* ---------- RELATED ---------- */
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
      type: rUrl.includes('/series/') ? 'series' : 'movie',
    });
  });

  /* ---------- FINAL OBJECT ---------- */
  const cachedData: AnimeDetails & {
    _lastSeason: number;
    _lastEpisode: number;
  } = {
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
    type: 'series',

    // internal (cache only)
    _lastSeason: lastSeason,
    _lastEpisode: lastEpisode,
  };

  const ttl = config.cache?.ttl?.anime ?? 60 * 60 * 6;
  cache.set(cacheKey, cachedData, ttl);

  const { _lastSeason, _lastEpisode, ...publicData } = cachedData;
  return publicData;
}
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
