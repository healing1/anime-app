import { fetchTopAnime, fetchSeasonNow, fetchAnimeById, fetchAnimeByGenre, fetchAnimeByYear, searchAnime as jikanSearch, GENRE_MAP } from './jikan';
import { getMockAnimeList, getMockAnimeById, getMockAnimeByGenre, getMockAnimeByYear, searchMockAnime, getMockRecentUpdates, getMockTrending, getMockFollowing, getMockRecommendations } from './mockData';
import { sourceRegistry } from './sourceRegistry';
import type { Anime, Source } from '../types';
import type { SourceProfile } from './sourceTypes';

const USE_REAL_API = true;

export const GENRE_LIST = GENRE_MAP.map(g => g.label);
export { YEAR_OPTIONS, YEAR_RANGES } from './jikan';

// ── Resolve active source once per method call ──

async function getActiveSource() {
  try { return await sourceRegistry.getActive(); } catch { return null; }
}

export const api = {
  // ── Core data methods (source-aware) ──

  getAnimeList: async (page = 1, limit = 24) => {
    // Try active source first
    const source = await getActiveSource();
    if (source) {
      try {
        const result = await source.fetchHome(page, limit);
        if (result.data.length > 0) return result;
      } catch { /* fall through */ }
    }
    // Fallback: Jikan API or mock
    if (USE_REAL_API) {
      try { return await fetchTopAnime(page, limit); } catch { /* fallback */ }
    }
    return getMockAnimeList(page, limit);
  },

  getAnimeDetail: async (id: string) => {
    const source = await getActiveSource();
    if (source) {
      try {
        const result = await source.fetchDetail(id);
        if (result) return result;
      } catch { /* fall through */ }
    }
    // Fallback: use builtin (Jikan) or mock
    if (USE_REAL_API) {
      try {
        const result = await fetchAnimeById(id);
        if (result) return result;
      } catch { /* fallback */ }
    }
    return getMockAnimeById(id) || null;
  },

  getAnimeByGenre: async (genre: string, page = 1, limit = 24) => {
    const source = await getActiveSource();
    if (source) {
      try {
        const result = await source.fetchByCategory(genre, page, limit);
        if (result.data.length > 0) return result;
      } catch { /* fall through */ }
    }
    // Fallback: Jikan or mock
    if (USE_REAL_API && genre !== '全部') {
      try {
        const genreEntry = GENRE_MAP.find(g => g.label === genre);
        if (genreEntry?.id) return await fetchAnimeByGenre(genreEntry.id, page, limit);
      } catch { /* fallback */ }
    }
    return getMockAnimeByGenre(genre, page, limit);
  },

  getAnimeByYear: async (year: number, page = 1, limit = 24) => {
    if (USE_REAL_API && year > 0) {
      try { return await fetchAnimeByYear(year, page, limit); } catch { /* fallback */ }
    }
    return getMockAnimeByYear(year, page, limit);
  },

  searchAnime: async (query: string, page = 1, limit = 24) => {
    const source = await getActiveSource();
    if (source) {
      try {
        const result = await source.search(query, page, limit);
        if (result.data.length > 0) return result;
      } catch { /* fall through */ }
    }
    if (USE_REAL_API) {
      try {
        const result = await jikanSearch(query, page, limit);
        return result;
      } catch { /* fallback */ }
    }
    return { data: searchMockAnime(query), hasMore: false };
  },

  // ── Source-aware video methods ──

  /** Resolve video URLs dynamically from active source */
  resolveVideoSources: async (animeId: string, episodeNum: number): Promise<Source[]> => {
    const source = await getActiveSource();
    if (source) {
      try {
        const sources = await source.resolveVideoSources(animeId, episodeNum);
        if (sources.length > 0) return sources;
      } catch { /* fall through */ }
    }
    return []; // Caller should use episode's built-in sources
  },

  /** Resolve single video URL from active source */
  resolveVideoUrl: async (animeId: string, episodeNum: number): Promise<Source | null> => {
    const source = await getActiveSource();
    if (source) {
      try {
        return await source.resolveVideoUrl(animeId, episodeNum);
      } catch { /* fall through */ }
    }
    return null;
  },

  // ── Source management ──

  /** Get all available source profiles */
  getAvailableSources: async (): Promise<SourceProfile[]> => {
    try { return await sourceRegistry.getAllProfiles(); } catch { return []; }
  },

  /** Get active source profile */
  getActiveSourceProfile: async (): Promise<SourceProfile | null> => {
    try { return await sourceRegistry.getActiveProfile(); } catch { return null; }
  },

  /** Set active source by ID */
  setActiveSource: async (id: string): Promise<boolean> => {
    try { return await sourceRegistry.setActive(id); } catch { return false; }
  },

  /** Import a source from URL */
  importSource: async (url: string) => {
    try { return await sourceRegistry.importFromURL(url); } catch { return { success: false, error: '导入异常' }; }
  },

  /** Remove a source */
  removeSource: async (id: string): Promise<boolean> => {
    try { return await sourceRegistry.removeSource(id); } catch { return false; }
  },

  // ── Mock-only methods (no Jikan equivalent) ──

  getRecentUpdates: () => getMockRecentUpdates(10),
  getTrending: () => getMockTrending(12),
  getFollowing: async (ids: string[]) => {
    if (ids.length === 0) return [];
    const results = await Promise.all(ids.map(async (id) => {
      try {
        const source = await getActiveSource();
        if (source) {
          try { const detail = await source.fetchDetail(id); if (detail) return detail; } catch { /* fall through */ }
        }
        if (USE_REAL_API) {
          try { const detail = await fetchAnimeById(id); if (detail) return detail; } catch { /* fallback */ }
        }
        return getMockAnimeById(id) || null;
      } catch { return null; }
    }));
    return results.filter(Boolean) as Anime[];
  },
  getRecommendations: (currentId: string, count = 10) => getMockRecommendations(currentId, count),

  testConnection: async () => {
    try {
      await fetchTopAnime(1, 1);
      return true;
    } catch {
      return false;
    }
  },
};
