import { config } from '../config';
import { fetchHtml } from './http';
import { loadHtml, normalizeUrl, extractIdFromUrl } from './parser';
import { scrapeAnimeDetails, scrapeMovieDetails } from '../scrapers/anime';
import { scrapeAZ } from '../scrapers/az';
import { scrapeCategory } from '../scrapers/category';
import { logger } from 'hono/logger';

interface CrawlTask {
    type: 'az' | 'category' | 'anime' | 'movie' | 'series';
    url?: string;
    id?: string;
    params?: any;
}

export class Crawler {
    private visited = new Set<string>();
    private queue: CrawlTask[] = [];
    private isRunning = false;
    private visitedCount = 0;
    private errorsCount = 0;

    constructor() { }

    /**
     * Start the full crawl
     */
    start() {
        if (this.isRunning) {
            console.log('Crawler already running');
            return;
        }

        console.log('Starting Master Crawler...');
        this.isRunning = true;
        this.visited.clear();
        this.queue = [];
        this.visitedCount = 0;
        this.errorsCount = 0;

        // Seed the crawler
        this.seed();

        // Start processing
        this.processQueue();
    }

    /**
     * Stop the crawler
     */
    stop() {
        this.isRunning = false;
        console.log('Crawler stopped.');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            queueLength: this.queue.length,
            visitedCount: this.visitedCount,
            errorsCount: this.errorsCount
        };
    }

    private seed() {
        console.log('Seeding crawler queue...');
        // Seed A-Z (A-Z, 0-9)
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        for (const char of chars) {
            this.queue.push({ type: 'az', params: { letter: char, page: 1 } });
        }

        // Seed Categories
        ['anime', 'cartoon', 'movies', 'series'].forEach(cat => {
            this.queue.push({ type: 'category', params: { category: cat, page: 1 } });
        });
        console.log(`Seeding finished. Queue length: ${this.queue.length}`);
    }

    private async processQueue() {
        while (this.isRunning && this.queue.length > 0) {
            const task = this.queue.shift();
            if (!task) continue;

            try {
                await this.handleTask(task);
                this.visitedCount++;
            } catch (e) {
                console.error('Error processing task:', task);
                console.error(e);
                this.errorsCount++;
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 1000)); // 1 sec delay
        }

        if (this.queue.length === 0) {
            console.log('Crawler finished queue.');
            this.isRunning = false;
        }
    }

    private async handleTask(task: CrawlTask) {
        if (task.type === 'az') {
            const { letter, page } = task.params;
            console.log(`Crawling AZ: ${letter} Page ${page}`);
            const data = await scrapeAZ(letter, page);

            // Add items to queue
            let addedCount = 0;
            data.results.forEach(item => {
                const id = item.id;
                if (id && !this.visited.has(id)) {
                    this.visited.add(id);
                    this.queue.push({
                        type: (item.type === 'series' ? 'anime' : 'movie') as 'anime' | 'movie',
                        id: id
                    });
                    addedCount++;
                }
            });
            console.log(`Added ${addedCount} items to queue from ${letter} Page ${page}`);

            // Add next page if exists
            if (data.pagination?.hasNextPage) {
                this.queue.push({ type: 'az', params: { letter, page: page + 1 } });
            }

        } else if (task.type === 'category') {
            const { category, page } = task.params;
            console.log(`Crawling Category: ${category} Page ${page}`);
            const data = await scrapeCategory(category, page);

            data.results.forEach(item => {
                const id = item.id;
                if (id && !this.visited.has(id)) {
                    this.visited.add(id);
                    this.queue.push({
                        type: (item.type === 'series' ? 'anime' : 'movie') as 'anime' | 'movie',
                        id: id
                    });
                }
            });

            if (data.pagination?.hasNextPage) {
                this.queue.push({ type: 'category', params: { category, page: page + 1 } });
            }

        } else if ((task.type === 'anime' || task.type === 'series') && task.id) {
            console.log(`Crawling Anime: ${task.id}`);
            await scrapeAnimeDetails(task.id);

        } else if ((task.type === 'movie') && task.id) {
            console.log(`Crawling Movie: ${task.id}`);
            await scrapeMovieDetails(task.id);
        }
    }
}

export const crawler = new Crawler();
