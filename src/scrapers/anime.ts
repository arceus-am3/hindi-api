import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { AnimeDetails, Season, Episode, AnimeInfo } from '../types';

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
