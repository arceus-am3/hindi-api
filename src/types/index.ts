export interface AnimeInfo {
    id: string;
    title: string;
    poster: string;
    url: string;
    type?: 'series' | 'movie';
    language?: string[];
    year?: string;
}

export interface AnimeDetails extends AnimeInfo {
    description: string;
    genres: string[];
    languages: string[];
    rating?: string;
    status?: string;
    totalEpisodes?: number;
    seasons?: Season[];
    related?: AnimeInfo[];
}

export interface Season {
    seasonNumber: number;
    episodes: Episode[];
}

export interface Episode {
    id: string;
    episodeNumber: number;
    seasonNumber?: number;
    title: string;
    thumbnail?: string;
    url: string;
    releaseDate?: string;
}

export interface EpisodeDetails {
    id: string;
    title: string;
    episodeNumber: number;
    seasonNumber?: number;
    thumbnail?: string;
    sources: VideoSource[];
    downloads?: DownloadLink[];
    servers?: Server[];
}

export interface VideoSource {
    url: string;
    quality: string;
    type: 'hls' | 'mp4' | 'iframe' | 'other';
    server?: string;
}

export interface DownloadLink {
    url: string;
    quality: string;
    size?: string;
}

export interface Server {
    id: string;
    name: string;
    url: string;
}

export interface SearchResult {
    success: boolean;
    results: AnimeInfo[];
    pagination: Pagination;
}

export interface Pagination {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface SearchSuggestion {
    id: string;
    title: string;
    poster?: string;
    url: string;
}

export interface CategoryData {
    success: boolean;
    category: string;
    results: AnimeInfo[];
    pagination: Pagination;
}

export interface HomeData {
    latestSeries: AnimeInfo[];
    latestMovies: AnimeInfo[];
    trending: AnimeInfo[];
    popular: AnimeInfo[];
    featured: AnimeInfo[];
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface StreamData {
    success: boolean;
    streamUrl: string;
    type: string;
    headers?: Record<string, string>;
    title?: string;
    poster?: string;
}
