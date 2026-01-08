import { fetchHtml } from '../utils/http';
import { loadHtml, normalizeUrl } from '../utils/parser';
import { config } from '../config';

export interface ServerSource {
    serverName: string;
    serverIndex: number;
    iframeUrl: string;
}

/**
 * Extract all available server iframes from an ID (could be episode, movie, or series)
 */
export async function extractAllServers(id: string): Promise<ServerSource[]> {
    // Try multiple path patterns since we don't know the type
    const paths = [
        `/episode/${id}/`,
        `/movies/${id}/`,
        `/series/${id}/`
    ];

    let html = '';
    let foundUrl = '';

    for (const path of paths) {
        try {
            const url = `${config.baseUrl}${path}`;
            console.log(`Trying to extract servers from: ${url}`);
            const response = await fetchHtml(url);
            if (response && response.includes('options-')) {
                html = response;
                foundUrl = url;
                break;
            }
        } catch (e) {
            // Continue to next path
            continue;
        }
    }

    if (!html) {
        console.error(`Could not find any server options for ID: ${id}`);
        return [];
    }

    const $ = loadHtml(html);
    const servers: ServerSource[] = [];

    // Find all server option divs (id="options-0", "options-1", etc.)
    $('[id^="options-"]').each((index, el) => {
        const $el = $(el);
        const serverId = $el.attr('id');

        // Extract iframe from this server option
        const iframe = $el.find('iframe').first();
        const dataSrc = iframe.attr('data-src');
        const src = iframe.attr('src');
        const iframeSrc = dataSrc || src;

        if (iframeSrc) {
            // Try to find server name from the corresponding button
            const serverButton = $(`a[href="#${serverId}"]`);
            let serverName = `Server ${index + 1}`;

            if (serverButton.length > 0) {
                const buttonText = serverButton.text().trim();
                serverName = buttonText || serverName;
            }

            servers.push({
                serverName,
                serverIndex: index,
                iframeUrl: normalizeUrl(iframeSrc)
            });
        }
    });

    return servers;
}
