import { Hono } from 'hono';
import { scrapeAZ } from '../scrapers/az';

const app = new Hono();

app.get('/:letter', async (c) => {
    try {
        const letter = c.req.param('letter');
        const page = parseInt(c.req.query('page') || '1');

        if (!letter) {
            return c.json({
                success: false,
                error: 'Letter parameter is required',
            }, 400);
        }

        const data = await scrapeAZ(letter, page);
        return c.json(data);
    } catch (e) {
        console.error('Error in AZ route:', e);
        return c.json({
            success: false,
            error: 'Failed to fetch AZ data',
        }, 500);
    }
});

export default app;
