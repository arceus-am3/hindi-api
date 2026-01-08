import { Hono } from 'hono';
import { crawler } from '../utils/crawler';

const app = new Hono();

app.post('/start', (c) => {
    crawler.start();
    return c.json({
        success: true,
        message: 'Crawler started',
        status: crawler.getStatus()
    });
});

app.post('/stop', (c) => {
    crawler.stop();
    return c.json({
        success: true,
        message: 'Crawler stopped',
        status: crawler.getStatus()
    });
});

app.get('/status', (c) => {
    return c.json({
        success: true,
        status: crawler.getStatus()
    });
});

export default app;
