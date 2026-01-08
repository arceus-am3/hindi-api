import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { config } from './config';

// Import routes
import home from './routes/home';
import search from './routes/search';
import anime from './routes/anime';
import episode from './routes/episode';
import category from './routes/category';
import stream from './routes/stream';
import az from './routes/az';
import genre from './routes/genre';
import crawl from './routes/crawl';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// OpenAPI specification
const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'WatchAnimeWorld API',
        version: '1.0.0',
        description: 'A comprehensive RESTful API for scraping anime content from watchanimeworld.in',
    },
    servers: [
        {
            url: 'https://watchanimeworld-api.ryanwtf.workers.dev',
            description: 'Production server',
        },
        {
            url: `http://localhost:${config.server.port}`,
            description: 'Development server',
        },
    ],
    paths: {
        '/api/home': {
            get: {
                summary: 'Get homepage data',
                description: 'Returns latest series, movies, trending, popular, and featured content',
                tags: ['Home'],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                latestSeries: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                                                latestMovies: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                                                trending: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                                                popular: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                                                featured: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/search': {
            get: {
                summary: 'Search anime',
                description: 'Search for anime by keyword with pagination',
                tags: ['Search'],
                parameters: [
                    {
                        name: 'keyword',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Search keyword',
                    },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SearchResult' },
                            },
                        },
                    },
                },
            },
        },
        '/api/search/suggestions': {
            get: {
                summary: 'Get search suggestions',
                description: 'Get autocomplete suggestions for search',
                tags: ['Search'],
                parameters: [
                    {
                        name: 'keyword',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Search keyword',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        suggestions: { type: 'array', items: { $ref: '#/components/schemas/SearchSuggestion' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/anime/{id}': {
            get: {
                summary: 'Get anime details',
                description: 'Get detailed information about a specific anime/series',
                tags: ['Anime'],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Anime ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { $ref: '#/components/schemas/AnimeDetails' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/episode/{id}': {
            get: {
                summary: 'Get episode details',
                description: 'Get streaming sources and download links for an episode',
                tags: ['Episode'],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Episode ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { $ref: '#/components/schemas/EpisodeDetails' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/category/anime': {
            get: {
                summary: 'Get anime category',
                description: 'Browse anime category with pagination',
                tags: ['Category'],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/category/cartoon': {
            get: {
                summary: 'Get cartoon category',
                description: 'Browse cartoon category with pagination',
                tags: ['Category'],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/category/movies': {
            get: {
                summary: 'Get movies',
                description: 'Browse movies with pagination',
                tags: ['Category'],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/category/series': {
            get: {
                summary: 'Get series',
                description: 'Browse series with pagination',
                tags: ['Category'],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/category/language/{lang}': {
            get: {
                summary: 'Filter by language',
                description: 'Get anime filtered by language (hindi, tamil, telugu, english)',
                tags: ['Category'],
                parameters: [
                    {
                        name: 'lang',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', enum: ['hindi', 'tamil', 'telugu', 'english'] },
                        description: 'Language',
                    },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/stream/{episodeId}': {
            get: {
                summary: 'Get stream data',
                description: 'Get stream URL and metadata for an episode',
                tags: ['Stream'],
                parameters: [
                    {
                        name: 'episodeId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Episode ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/StreamData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/stream/embed/{episodeId}': {
            get: {
                summary: 'Get embed player',
                description: 'Get optimized embed player HTML with HLS.js support',
                tags: ['Stream'],
                parameters: [
                    {
                        name: 'episodeId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Episode ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'HTML player',
                        content: {
                            'text/html': {
                                schema: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        '/api/az/{letter}': {
            get: {
                summary: 'Get A-Z content',
                description: 'Get series starting with a specific letter',
                tags: ['AZ'],
                parameters: [
                    {
                        name: 'letter',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Letter (A-Z, 0-9)',
                    },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/genre/{genre}': {
            get: {
                summary: 'Get content by genre',
                tags: ['Genre'],
                parameters: [
                    {
                        name: 'genre',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Genre name',
                    },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 1 },
                        description: 'Page number',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CategoryData' },
                            },
                        },
                    },
                },
            },
        },
        '/api/crawl/start': {
            post: {
                summary: 'Start crawler',
                tags: ['Crawler'],
                responses: {
                    '200': {
                        description: 'Crawler started',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        message: { type: 'string' },
                                        status: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/crawl/stop': {
            post: {
                summary: 'Stop crawler',
                tags: ['Crawler'],
                responses: {
                    '200': {
                        description: 'Crawler stopped',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        message: { type: 'string' },
                                        status: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/crawl/status': {
            get: {
                summary: 'Get crawler status',
                tags: ['Crawler'],
                responses: {
                    '200': {
                        description: 'Crawler status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        status: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            AnimeInfo: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    poster: { type: 'string' },
                    url: { type: 'string' },
                    type: { type: 'string', enum: ['series', 'movie'] },
                    language: { type: 'array', items: { type: 'string' } },
                    year: { type: 'string' },
                },
            },
            AnimeDetails: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    poster: { type: 'string' },
                    url: { type: 'string' },
                    description: { type: 'string' },
                    genres: { type: 'array', items: { type: 'string' } },
                    languages: { type: 'array', items: { type: 'string' } },
                    rating: { type: 'string' },
                    status: { type: 'string' },
                    totalEpisodes: { type: 'integer' },
                    type: { type: 'string', enum: ['series', 'movie'] },
                },
            },
            SearchResult: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    results: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                },
            },
            SearchSuggestion: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    poster: { type: 'string' },
                    url: { type: 'string' },
                },
            },
            CategoryData: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    results: { type: 'array', items: { $ref: '#/components/schemas/AnimeInfo' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                },
            },
            EpisodeDetails: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    episodeNumber: { type: 'integer' },
                    seasonNumber: { type: 'integer' },
                    thumbnail: { type: 'string' },
                    sources: { type: 'array', items: { $ref: '#/components/schemas/VideoSource' } },
                },
            },
            VideoSource: {
                type: 'object',
                properties: {
                    url: { type: 'string' },
                    quality: { type: 'string' },
                    type: { type: 'string', enum: ['hls', 'mp4', 'iframe', 'other'] },
                    server: { type: 'string' },
                },
            },
            StreamData: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    streamUrl: { type: 'string' },
                    type: { type: 'string' },
                },
            },
            Pagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    hasNextPage: { type: 'boolean' },
                    hasPrevPage: { type: 'boolean' },
                },
            },
        },
    },
};

// Swagger UI at root
app.get(
    '/',
    swaggerUI({
        url: '/openapi.json',
    })
);

// OpenAPI JSON endpoint
app.get('/openapi.json', (c) => {
    const spec = JSON.parse(JSON.stringify(openApiSpec));
    const url = new URL(c.req.url);
    spec.servers = [
        {
            url: `${url.protocol}//${url.host}`,
            description: 'Current server',
        }
    ];
    return c.json(spec);
});

// API routes
app.route('/api/home', home);
app.route('/api/search', search);
app.route('/api/anime', anime);
app.route('/api/series', anime); // Alias
app.route('/api/movies', anime); // Alias
app.route('/api/episode', episode);
app.route('/api/category', category);
app.route('/api/stream', stream);
app.route('/api/az', az);
app.route('/api/genre', genre);
app.route('/api/crawl', crawl);

// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.notFound((c) => {
    return c.json({
        success: false,
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
    }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Global error handler:', err);
    return c.json({
        success: false,
        error: 'Internal Server Error',
        message: err.message,
    }, 500);
});



// ... (keep existing code)

// Start server
const port = config.server.port;
const host = config.server.host;

console.log(`🚀 WatchAnimeWorld API starting on http://${host}:${port}`);
console.log(`📚 Documentation available at http://${host}:${port}/`);

export default {
    port,
    hostname: host,
    fetch: app.fetch,
};
