
import { MediaCategory } from '../types';

export interface MediaSuggestion {
    title: string;
    releaseDate?: string;
    posterUrl?: string;
    description?: string;
}

/**
 * Searches across multiple keyless APIs with fallbacks to ensure results
 * are returned even if one source is blocked or lacks data.
 */
export const searchMedia = async (category: MediaCategory, query: string): Promise<MediaSuggestion[]> => {
    if (!query || query.length < 2) return [];

    try {
        switch (category) {
            case 'Anime':
                return await fetchAnime(query);
            case 'TV':
                return await fetchTV(query);
            case 'Film':
                // Attempt TVMaze first (reliable CORS), then Wikipedia (universal)
                const tvMazeFilms = await fetchTV(query);
                if (tvMazeFilms.length > 2) return tvMazeFilms;
                
                const wikiFilms = await fetchWikipedia(query, 'film');
                if (wikiFilms.length > 0) return wikiFilms;

                return await fetchFilms(query); // iTunes fallback
            case 'Books':
            case 'Comics':
                return await fetchBooks(query);
            case 'Games':
                const wikiGames = await fetchWikipedia(query, 'video game');
                if (wikiGames.length > 0) return wikiGames;
                return await fetchGames(query);
            default:
                return await fetchWikipedia(query, '');
        }
    } catch (error) {
        console.error("Search pipeline failed, attempting Wikipedia fallback:", error);
        return await fetchWikipedia(query, '');
    }
};

const fetchAnime = async (query: string): Promise<MediaSuggestion[]> => {
    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        return (data.data || []).map((item: any) => ({
            title: item.title,
            releaseDate: item.aired?.from ? item.aired.from.split('T')[0] : undefined,
            posterUrl: item.images?.webp?.image_url,
            description: item.synopsis
        }));
    } catch { return []; }
};

const fetchTV = async (query: string): Promise<MediaSuggestion[]> => {
    try {
        // TVMaze is excellent for CORS and actually indexes many movies
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.slice(0, 5).map((entry: any) => ({
            title: entry.show.name,
            releaseDate: entry.show.premiered,
            posterUrl: entry.show.image?.medium || entry.show.image?.original,
            description: entry.show.summary?.replace(/<[^>]*>/g, '')
        }));
    } catch { return []; }
};

const fetchFilms = async (query: string): Promise<MediaSuggestion[]> => {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=movie&limit=5`);
        const data = await response.json();
        return (data.results || []).map((item: any) => ({
            title: item.trackName,
            releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : undefined,
            posterUrl: item.artworkUrl100?.replace('100x100bb', '600x600bb'),
            description: item.longDescription || item.shortDescription
        }));
    } catch { return []; }
};

const fetchBooks = async (query: string): Promise<MediaSuggestion[]> => {
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`);
        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            title: item.volumeInfo.title,
            releaseDate: item.volumeInfo.publishedDate,
            posterUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
            description: item.volumeInfo.description
        }));
    } catch { return []; }
};

const fetchGames = async (query: string): Promise<MediaSuggestion[]> => {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=5`);
        const data = await response.json();
        return (data.results || []).map((item: any) => ({
            title: item.trackName,
            releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : undefined,
            posterUrl: item.artworkUrl100?.replace('100x100bb', '512x512bb'),
            description: item.description
        }));
    } catch { return []; }
};

/**
 * Ultimate keyless fallback using Wikipedia.
 * Very reliable CORS and covers almost everything.
 */
const fetchWikipedia = async (query: string, context: string): Promise<MediaSuggestion[]> => {
    try {
        const searchQuery = context ? `${query} (${context})` : query;
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`);
        const searchData = await searchRes.json();
        
        if (!searchData.query?.search?.length) return [];

        const results: MediaSuggestion[] = [];
        
        // Get details (including images) for the top 3 results
        for (const item of searchData.query.search.slice(0, 3)) {
            const detailRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/ /g, '_'))}`);
            const detailData = await detailRes.json();
            
            results.push({
                title: detailData.title || item.title,
                description: detailData.extract,
                posterUrl: detailData.thumbnail?.source,
                // Wikipedia doesn't have a standardized "release date" field in summary, 
                // but we can try to extract a year from the extract if needed.
            });
        }
        
        return results;
    } catch (e) {
        console.error("Wikipedia fetch failed:", e);
        return [];
    }
};
