import { Hono } from 'hono';
import { scrapeGenre } from '../scrapers/genre';

const app = new Hono();

app.get('/:genre', async (c) => {
    try {
        const genre = c.req.param('genre');
        const page = parseInt(c.req.query('page') || '1');

        if (!genre) {
            return c.json({
                success: false,
                error: 'Genre parameter is required',
            }, 400);
        }

        const data = await scrapeGenre(genre, page);
        return c.json(data);
    } catch (e) {
        console.error('Error in Genre route:', e);
        return c.json({
            success: false,
            error: 'Failed to fetch genre data',
        }, 500);
    }
});

export default app;
