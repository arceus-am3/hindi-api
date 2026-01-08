import { Hono } from 'hono';
import { scrapeCategory, scrapeCategoryByLanguage } from '../scrapers/category';

const category = new Hono();

/**
 * GET /api/category/anime?page={page}
 * Get anime category
 */
category.get('/anime', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategory('anime', page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/anime:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch anime category',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /api/category/cartoon?page={page}
 * Get cartoon category
 */
category.get('/cartoon', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategory('cartoon', page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/cartoon:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch cartoon category',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /api/category/movies?page={page}
 * Get movies
 */
category.get('/movies', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategory('movies', page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/movies:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch movies',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /api/category/series?page={page}
 * Get series
 */
category.get('/series', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategory('series', page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/series:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch series',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /api/category/language/:lang?page={page}
 * Filter by language (hindi, tamil, telugu, english)
 */
category.get('/language/:lang', async (c) => {
    try {
        const lang = c.req.param('lang');
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategoryByLanguage(lang, page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/language/:lang:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch language category',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /api/category/:name?page={page}
 * Generic category endpoint
 */
category.get('/:name', async (c) => {
    try {
        const name = c.req.param('name');
        const page = parseInt(c.req.query('page') || '1');
        const data = await scrapeCategory(name, page);
        return c.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in /api/category/:name:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch category',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

export default category;
