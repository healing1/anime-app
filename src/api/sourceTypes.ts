import type { Anime, Episode, Source } from '../types';

// ── Source profile: describes a video source backend ──

export type SourceType = 'builtin' | 'rest' | 'kitsu' | 'tvbox';

export interface SourceProfile {
  id: string;
  name: string;
  type: SourceType;
  description?: string;
  /** Base URL for REST-type sources */
  baseUrl?: string;
  /** Endpoint mappings for REST-type sources */
  endpoints?: Record<string, string>;
  addedAt: number;
  /** Optional per-source configuration */
  config?: Record<string, any>;
}

// ── Source provider interface ──

export interface AnimeSourceProvider {
  readonly profile: SourceProfile;

  /** Fetch home page anime list (banners + recent + trending) */
  fetchHome(page?: number, limit?: number): Promise<{ data: Anime[]; hasMore: boolean }>;

  /** Fetch anime detail by ID, including episodes with video sources */
  fetchDetail(id: string): Promise<Anime | null>;

  /** Search anime by query string */
  search(query: string, page?: number, limit?: number): Promise<{ data: Anime[]; hasMore: boolean }>;

  /** Get available categories/genres */
  getCategories(): Promise<string[]>;

  /** Fetch anime by category */
  fetchByCategory(category: string, page?: number, limit?: number): Promise<{ data: Anime[]; hasMore: boolean }>;

  /** Resolve video playable URL for an episode */
  resolveVideoUrl(animeId: string, episodeNum: number): Promise<Source | null>;

  /** Get multiple video sources for an episode (for source switching) */
  resolveVideoSources(animeId: string, episodeNum: number): Promise<Source[]>;
}

// ── REST API response shape (configurable per source) ──

export interface RestEndpointConfig {
  home: string;       // GET → { data: Anime[] }
  detail: string;     // GET /:id → Anime
  search: string;     // GET ?q= → { data: Anime[] }
  categories: string; // GET → string[]
  categoryData: string; // GET ?cat=&page= → { data: Anime[] }
  videoUrl: string;   // GET ?id=&ep= → Source
  videoSources: string; // GET ?id=&ep= → Source[]
}
