# WatchAnimeWorld API

A comprehensive RESTful API for scraping anime content from [watchanimeworld.in](https://watchanimeworld.in), built with Hono.js and Bun.

## Features

- **Home Page Data** - Latest series, movies, trending, and popular content
- **Search Engine** - Full-text search with pagination and autocomplete suggestions
- **Anime Details** - Comprehensive information with seasons, episodes, and related content
- **Episode Streaming** - Extract video sources and streaming links from multiple servers
- **Category Browsing** - Filter by genre, language (Hindi, Tamil, Telugu, English), type
- **Stream Proxy** - CORS bypass and optimized embed player with HLS.js support
- **High Performance** - In-memory caching with TTL
- **Cloudflare Bypass** - Cookie jar support and user-agent rotation
- **Swagger UI** - Interactive API documentation at root endpoint

## Live Deployment

**Production URL**: <https://watchanimeworld-api.ryanwtf.workers.dev>

The API is deployed on Cloudflare Workers for global edge performance.

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher

### Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start production server
bun start

# Build for production
bun run build
```

## API Endpoints

### Base URL

**Production:**

```
https://watchanimeworld-api.ryanwtf.workers.dev
```

**Local Development:**

```
http://localhost:3000
```

### Documentation

- **Interactive Docs**: `GET /` - API documentation and endpoint list
- **Health Check**: `GET /health` - Server health status

### Core Endpoints

#### Home

```
GET /api/home
```

Get homepage data with latest series, movies, trending, and popular content.

**Response:**

```json
{
  "success": true,
  "data": {
    "latestSeries": [...],
    "latestMovies": [...],
    "trending": [...],
    "popular": [...],
    "featured": [...]
  }
}
```

#### Search

```
GET /api/search?keyword={query}&page={page}
```

Search for anime by keyword.

**Parameters:**

- `keyword` (required) - Search query
- `page` (optional) - Page number (default: 1)

**Response:**

```json
{
  "success": true,
  "results": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Search Suggestions

```
GET /api/search/suggestions?keyword={query}
```

Get search suggestions for autocomplete.

#### Anime Details

```
GET /api/anime/:id
GET /api/series/:id
GET /api/movies/:id
```

Get detailed information about a specific anime/series/movie.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "anime-id",
    "title": "Anime Title",
    "poster": "...",
    "description": "...",
    "genres": [...],
    "languages": [...],
    "seasons": [...],
    "related": [...]
  }
}
```

#### Episode Streaming

```
GET /api/episode/:id
```

Get streaming links for an episode.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "episode-id",
    "title": "Episode Title",
    "sources": [...],
    "downloads": [...],
    "servers": [...]
  }
}
```

#### Episode Server

```
GET /api/episode/:id/servers/:serverId
```

Get specific server links for an episode.

### Category Endpoints

#### Anime Category

```
GET /api/category/anime?page={page}
```

Get anime list.

#### Cartoon Category

```
GET /api/category/cartoon?page={page}
```

Get cartoon list.

#### Movies

```
GET /api/category/movies?page={page}
```

Get anime movies.

#### Series

```
GET /api/category/series?page={page}
```

Get anime series.

#### Language Filter

```
GET /api/category/language/:lang?page={page}
```

Get anime by language.

**Supported Languages:**

- `hindi`
- `tamil`
- `telugu`
- `english`

### Stream Endpoints

#### Stream Info

```
GET /api/stream/:episodeId
```

Get stream URL and metadata for an episode.

**Response:**

```json
{
  "success": true,
  "streamUrl": "https://...",
  "type": "hls"
}
```

#### Stream Proxy

```
GET /api/stream/:episodeId/proxy
```

Proxy the actual stream for CORS bypass.

#### Optimized Embed Player

```
GET /api/embed/:episodeId
```

Get optimized, ad-free player embed with HLS.js support.

## Configuration

Edit `src/config.ts` to customize:

- Base URL
- Cache TTL settings
- Server port and host
- Request timeout and retries
- User agents for rotation

## Development

```bash
# Run in development mode with hot reload
bun run dev

# Run tests
bun test
```

## Disclaimer

This API is for educational purposes only. Web scraping may be subject to the website's terms of service. Please ensure you have the right to scrape this content and use it responsibly.

## License

MIT
