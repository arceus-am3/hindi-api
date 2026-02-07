import { fetchHtml } from '../utils/http';
import { loadHtml, cleanText, normalizeUrl, extractIdFromUrl } from '../utils/parser';
import { cache, generateCacheKey } from '../utils/cache';
import { config } from '../config';
import type { AnimeDetails, Season, Episode, AnimeInfo } from '../types';

/* =========================
   HELPERS
========================= */

function parseSeasonEpisode(text: string) {
  const match = text.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { season: 1, episode: 1 };

  return {
    season: Number(match[1]),
    episode: Number(match[2]),
  };
}

/* =========================
   ANIME DETAILS
========================= */

export async function scrapeAnimeDetails(id: string): Promise<AnimeDetails> {
  const cacheKey = generateCacheKey('anime', id);
  const cached = cache.get<AnimeDetails>(cacheKey);
  if (cached) return cached;

  const url = `${config.baseUrl}/series/${id}/`;
  const html = await fetchHtml(url);
  const $ = loadHtml(html);

  /* ===== BASIC INFO ===== */

  const title = cleanText($('h1').first().text());
  const poster = normalizeUrl($('article img').first().attr('src') || '');
  const description = cleanText($('.description, .summary, .content').first().text());

  /* ===== GENRES ===== */

  const genres: string[] = [];
  $('.genres a, a[rel="tag"]').each((_, el) => {
    const g = cleanText($(el).text());
    if (g && !genres.includes(g)) genres.push(g);
  });

  /* ===== LANGUAGES ===== */

  const languages: string[] = [];
  $('.languages a').each((_, el) => {
    const l = cleanText($(el).text());
    if (l && !languages.includes(l)) languages.push(l);
  });

  if (languages.length === 0) {
    const t = $.text().toLowerCase();
    if (t.includes('hindi')) languages.push('Hindi');
    if (t.includes('english')) languages.push('English');
    if (t.includes('japanese')) languages.push('Japanese');
  }

  const rating = cleanText($('.rating').first().text());
  const status = cleanText($('.status').first().text());

  /* ===== SEASONS & EPISODES ===== */

  const seasonMap = new Map<number, Episode[]>();

  $('#episode_by_temp li').each((_, el) => {
    const label = cleanText($(el).text()); // 1x12
    const link = $(el).find('a').attr('href') || '';
    if (!label || !link) return;

    const { season, episode } = parseSeasonEpisode(label);

    if (!seasonMap.has(season)) seasonMap.set(season, []);

    seasonMap.get(season)!.push({
      id: extractIdFromUrl(link),
      title: label,
      episodeNumber: episode,
      seasonNumber: season,
      url: normalizeUrl(link),
      thumbnail: '',
    });
  });

  const seasons: Season[] = [];

  for (const [seasonNumber, episodes] of seasonMap.entries()) {
    seasons.push({
      seasonNumber,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
    });
  }

  seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

  const totalEpisodes = seasons.reduce((s, x) => s + x.episodes.length, 0);

  /* ===== RELATED ===== */

  const related: AnimeInfo[] = [];
  $('.related article').each((_, el) => {
    const link = $(el).find('a').first();
    const rUrl = normalizeUrl(link.attr('href') || '');
    const rTitle = cleanText(link.text());
    const rPoster = normalizeUrl($(el).find('img').attr('src') || '');

    if (rUrl && rTitle) {
      related.push({
        id: extractIdFromUrl(rUrl),
        title: rTitle,
        poster: rPoster,
        url: rUrl,
        type: rUrl.includes('/series/') ? 'series' : 'movie',
      });
    }
  });

  const data: AnimeDetails = {
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
    seasons: seasons.length ? seasons : undefined,
    related: related.length ? related : undefined,
    type: 'series',
  };

  cache.set(cacheKey, data, config.cache.ttl.anime);
  return data;
}

/* =========================
   SEASONS ONLY ENDPOINT
========================= */

export async function scrapeAnimeSeasons(id: string) {
  const anime = await scrapeAnimeDetails(id);

  if (!anime.seasons) {
    return { totalSeasons: 0, seasons: [] };
  }

  return {
    totalSeasons: anime.seasons.length,
    seasons: anime.seasons.map(s => ({
      seasonNumber: s.seasonNumber,
      totalEpisodes: s.episodes.length,
      episodes: s.episodes.map(e => ({
        id: e.id,
        episodeNumber: e.episodeNumber,
        url: e.url,
        thumbnail: e.thumbnail,
      })),
    })),
  };
}

/* =========================
   MOVIE DETAILS
========================= */

export async function scrapeMovieDetails(id: string): Promise<AnimeDetails> {
  const cacheKey = generateCacheKey('movie', id);
  const cached = cache.get<AnimeDetails>(cacheKey);
  if (cached) return cached;

  const url = `${config.baseUrl}/movies/${id}/`;
  const html = await fetchHtml(url);
  const $ = loadHtml(html);

  const title = cleanText($('h1').first().text());
  const poster = normalizeUrl($('article img').first().attr('src') || '');
  const description = cleanText($('.description, .summary').first().text());
  const rating = cleanText($('.rating').first().text());

  const data: AnimeDetails = {
    id,
    title,
    poster,
    url,
    description,
    rating: rating || undefined,
    type: 'movie',
  };

  cache.set(cacheKey, data, config.cache.ttl.anime);
  return data;
}
