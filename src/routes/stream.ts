import { Hono } from 'hono';
import { getStreamData, proxyStream } from '../scrapers/stream';
import { stream as streamResponse } from 'hono/streaming';
import { getIframeEmbedHtml } from './iframe-player';

const stream = new Hono();

/**
 * GET /api/stream/:episodeId
 * Get stream URL for an episode
 */
stream.get('/:episodeId', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const data = await getStreamData(episodeId);
    return c.json(data);
  } catch (error) {
    console.error('Error in /api/stream/:episodeId:', error);
    return c.json({
      success: false,
      error: 'Failed to get stream data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/stream/:episodeId/proxy
 * Proxy the actual stream (for CORS bypass)
 */
stream.get('/:episodeId/proxy', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const streamData = await getStreamData(episodeId);

    if (!streamData.success || !streamData.streamUrl) {
      return c.json({
        success: false,
        error: 'No stream URL found',
      }, 404);
    }

    // Proxy the stream
    const response = await proxyStream(streamData.streamUrl);

    // Set appropriate headers
    c.header('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    c.header('Access-Control-Allow-Origin', '*');

    // Stream the response
    return streamResponse(c, async (stream) => {
      for await (const chunk of response.data) {
        await stream.write(chunk);
      }
    });
  } catch (error) {
    console.error('Error in /api/stream/:episodeId/proxy:', error);
    return c.json({
      success: false,
      error: 'Failed to proxy stream',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/stream/embed/:episodeId
 * Get optimized embed player HTML
 */
stream.get('/embed/:episodeId', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');

    // Import server extraction
    const { extractAllServers } = await import('../scrapers/servers');

    // Get all available servers
    const servers = await extractAllServers(episodeId);

    if (!servers || servers.length === 0) {
      return c.html(getIframeEmbedHtml([], 'No Servers Available'));
    }

    // Map servers to player format
    const playerServers = servers.map(s => ({
      name: s.serverName,
      url: s.iframeUrl
    }));

    // Get title/poster metadata
    let title = 'VidSrc';
    let poster = '';

    try {
      const { scrapeEpisode } = await import('../scrapers/episode');
      const { scrapeAnimeDetails, scrapeMovieDetails } = await import('../scrapers/anime');

      // Try episode first
      try {
        const episode = await scrapeEpisode(episodeId);
        title = episode.title || title;
        poster = episode.thumbnail || '';
      } catch (e) {
        // Not an episode, try movie or series
        console.log(`Embed: ID ${episodeId} is not an episode, trying movie/series...`);
        try {
          const details = await scrapeMovieDetails(episodeId);
          if (details && details.title) {
            title = details.title;
            poster = details.poster || '';
          }
        } catch (e2) {
          try {
            const details = await scrapeAnimeDetails(episodeId);
            if (details && details.title) {
              title = details.title;
              poster = details.poster || '';
            }
          } catch (e3) {
            console.log('Embed: Could not fetch metadata from any source');
          }
        }
      }
    } catch (e) {
      console.log('Embed: Error loading scraper modules');
    }

    return c.html(getIframeEmbedHtml(playerServers, title));
  } catch (error) {
    console.error('Error in /api/stream/embed/:episodeId:', error);
    return c.html(getIframeEmbedHtml([], 'Error loading stream'));
  }
});

export default stream;
