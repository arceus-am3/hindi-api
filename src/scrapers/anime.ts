import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { AnimeDetails, Season, Episode, AnimeInfo } from '../types';

/* =========================
   Fast check: next episode
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
      'range': 'bytes=0-0', // ultra-light
    },
  });
  return res.status === 200;
}

/* =========================
   MAIN SCRAPER
   ========================= */
export async function scrapeAnimeDetails(id: string): Promise<AnimeDetails> {
  const cacheKey = generateCacheKey('anime', id);

  // ---------- SMART CACHE ----------
  const cached = cache.get<AnimeDetails & {
    _lastSeason?: number;
    _lastEpisode?: number;
  }>(cacheKey);

  if (cached && cached._lastSeason && cached._lastEpisode !== undefined) {
    // only 1 fast check
    const updated = await hasNewEpisode(
      id,
      cached._lastSeason,
      cached._lastEpisode
    );
    if (!updated) return cached; // ✅ return cache
    cache.delete?.(cacheKey);     // ❌ invalidate if new ep
  }

  // ---------- BASIC PAGE ----------
  const url = `${config.baseUrl}/series/${id}/`;
  const html = await fetchHtml(url);
  const $ = loadHtml(html);

  const title = cleanText($('h1').first().text());
  const poster = normalizeUrl($('article img').first().attr('src') || '');
  const description = cleanText($('.content').first().text());

  // genres
  const genres: string[] = [];
  $('a[rel="tag"]').each((_, el) => {
    const g = cleanText($(el).text());
    if (g) genres.push(g);
  });

  // languages
  const languages: string[] = [];
  const text = $.text().toLowerCase();
  if (text.includes('hindi')) languages.push('Hindi');
  if (text.includes('tamil')) languages.push('Tamil');
  if (text.includes('telugu')) languages.push('Telugu');
  if (text.includes('english')) languages.push('English');

  // ---------- SEASONS (URL PATTERN) ----------
  const seasons: Season[] = [];
  const MAX_SEASONS = 10;
  const MAX_EPISODES = 25;

  let lastSeason = 1;
  let lastEpisode = 0;

  for (let s = 1; s <= MAX_SEASONS; s++) {
    const episodes: Episode[] = [];

    for (let e = 1; e <= MAX_EPISODES; e++) {
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

    if (episodes.length) seasons.push({ seasonNumber: s, episodes });
    else break; // no more seasons
  }

  const totalEpisodes = seasons.reduce(
    (sum, s) => sum + s.episodes.length,
    0
  );

  // ---------- RELATED ----------
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

  const animeDetails: AnimeDetails & {
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

    // internal (backend only)
    _lastSeason: lastSeason,
    _lastEpisode: lastEpisode,
  };

  // ---------- CACHE ----------
  cache.set(cacheKey, animeDetails, 60 * 60 * 24 * 7); // 7 days
  return animeDetails;
}
