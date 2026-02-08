import { Hono } from 'hono';
import { scrapeAnimeDetails, scrapeMovieDetails } from '../scrapers/anime';

const anime = new Hono();

/**
 * GET /api/series/:id
 */
anime.get('/series/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await scrapeAnimeDetails(id);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch series details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/movies/:id
 */
anime.get('/movies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await scrapeMovieDetails(id);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch movie details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/anime/:id
 * 👇 ALWAYS LAST
 */
anime.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await scrapeAnimeDetails(id);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch anime details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default anime;
