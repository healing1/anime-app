import axios from 'axios';
import type { Anime, Episode, Source } from '../types';
import type { SourceProfile, AnimeSourceProvider } from './sourceTypes';

const BASE = 'https://kitsu.io/api/edge';

// Reuse the same diverse video pool pattern for episode sources
const VIDEO_POOL: Source[][] = [
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/sintel-480p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'Kitsu源' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function getSourcesForAnime(animeId: string, episodeNum: number): Source[] {
  return VIDEO_POOL[(hashStr(animeId) + episodeNum) % VIDEO_POOL.length];
}

function genEpisodes(count: number, animeId: string): Episode[] {
  const n = Math.min(count, 200);
  return Array.from({ length: n }, (_, i) => ({
    id: `${animeId}-ep${i + 1}`,
    num: i + 1,
    title: `第${i + 1}集`,
    thumbnail: `https://picsum.photos/seed/${animeId}ep${i + 1}/320/180`,
    sources: getSourcesForAnime(animeId, i + 1),
  }));
}

// English Kitsu category titles → Chinese
const GENRE_CN: Record<string, string> = {
  Action: '动作', Adventure: '冒险', Comedy: '喜剧', Drama: '剧情',
  Fantasy: '奇幻', Horror: '恐怖', Mystery: '悬疑', Romance: '恋爱',
  'Sci-Fi': '科幻', 'Slice of Life': '日常', Sports: '体育',
  Supernatural: '超自然', Thriller: '惊悚', Mecha: '机甲',
  Music: '音乐', School: '校园', Ecchi: '后宫',
  Historical: '历史', Military: '军事', Psychological: '心理',
  Seinen: '青年', Shounen: '少年', Shoujo: '少女', Isekai: '异世界',
  'Martial Arts': '武术', Magic: '魔法', Demons: '妖魔',
  Samurai: '武士', Vampire: '吸血鬼', Space: '太空',
  Police: '警匪', Game: '游戏', Cooking: '美食',
  Cyberpunk: '赛博朋克', 'Dark Fantasy': '暗黑奇幻',
  'Coming Of Age': '成长', Crime: '犯罪', Conspiracy: '阴谋',
  'Battle Royale': '大逃杀', 'Urban Fantasy': '都市奇幻',
  Zombie: '丧尸', Tragedy: '悲剧', Parody: '搞笑',
  'Post Apocalyptic': '末日', Steampunk: '蒸汽朋克',
  Harem: '后宫', 'Reverse Harem': '逆后宫',
  'Time Travel': '时间旅行', Reincarnation: '转生',
  'Love Triangle': '三角恋', 'Age Gap': '年龄差',
  Wrestling: '摔跤', Boxing: '拳击', Basketball: '篮球',
  Baseball: '棒球', Soccer: '足球', Cycling: '骑行',
  Swimming: '游泳', Tennis: '网球', Volleyball: '排球',
  Survival: '生存', Pandemic: '瘟疫',
};

function translateGenre(name: string): string {
  return GENRE_CN[name] || name;
}

// Kitsu JSON:API types
interface KitsuAnimeAttrs {
  titles: Record<string, string>;
  canonicalTitle: string;
  synopsis: string;
  description: string;
  averageRating: string;
  popularityRank: number;
  episodeCount: number;
  startDate: string;
  status: string;
  posterImage: {
    tiny: string; small: string; medium: string; large: string; original: string;
  };
  coverImage: {
    tiny: string; small: string; large: string; original: string;
  };
  ageRating: string;
  subtype: string;
}

interface KitsuAnimeItem {
  id: string;
  attributes: KitsuAnimeAttrs;
  relationships: {
    categories?: { links: { related: string } };
    genres?: { links: { related: string } };
  };
}

interface KitsuResponse<T> {
  data: T[];
  meta: { count: number };
  links: { first: string; next?: string; last: string };
}

const MAX_PAGE_LIMIT = 20; // Kitsu API max page limit

const kitsuClient = axios.create({ baseURL: BASE, timeout: 10000 });

// Request queue for rate limiting (Kitsu allows ~1 req/s)
let requestQueue: Promise<void> = Promise.resolve();
function rateLimit(): Promise<void> {
  const next = requestQueue.then(() => new Promise<void>(r => setTimeout(r, 300)));
  requestQueue = next;
  return next;
}

function clampLimit(limit: number): number {
  return Math.min(limit, MAX_PAGE_LIMIT);
}

// Helper to fetch genres for an anime from its relationships
async function fetchGenres(animeId: string): Promise<string[]> {
  try {
    await rateLimit();
    const res = await kitsuClient.get<{ data: Array<{ attributes: { title: string } }> }>(
      `/anime/${animeId}/categories?page[limit]=10`
    );
    return (res.data.data || []).map(c => translateGenre(c.attributes.title)).filter(Boolean);
  } catch {
    return ['其他'];
  }
}

// Map Kitsu anime to our Anime type
async function mapAnime(item: KitsuAnimeItem): Promise<Anime> {
  const a = item.attributes;
  const year = a.startDate ? new Date(a.startDate).getFullYear() : new Date().getFullYear();
  const rating = a.averageRating ? Math.round((parseFloat(a.averageRating) / 10) * 10) / 10 : 7.0;

  // Fetch genres (with timeout)
  let genres: string[] = [];
  try {
    const genrePromise = fetchGenres(item.id);
    const timeoutPromise = new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    genres = await Promise.race([genrePromise, timeoutPromise]);
  } catch { genres = ['其他']; }
  if (genres.length === 0) genres = ['其他'];

  return {
    id: String(item.id),
    title: a.titles.en_jp || a.titles.en || a.canonicalTitle || '',
    cover: a.posterImage?.large || a.posterImage?.medium || '',
    banner: a.coverImage?.large || a.coverImage?.original || a.posterImage?.large || '',
    year,
    genres,
    synopsis: (a.synopsis || a.description || '暂无简介')
      .replace(/\[Written by MAL Rewrite\]/g, '')
      .replace(/\(Source: [^)]+\)/g, '')
      .trim(),
    rating,
    episodes: genEpisodes(a.episodeCount || 12, String(item.id)),
    updatedAt: a.startDate || new Date().toISOString(),
    isNew: a.status === 'current',
    status: a.status === 'current' ? 'airing' : a.status === 'finished' ? 'completed' : 'unknown',
  };
}

// Sync version for listing (genres fetched lazily, use placeholder)
function mapAnimeSync(item: KitsuAnimeItem): Anime {
  const a = item.attributes;
  const year = a.startDate ? new Date(a.startDate).getFullYear() : new Date().getFullYear();
  const rating = a.averageRating ? Math.round((parseFloat(a.averageRating) / 10) * 10) / 10 : 7.0;
  return {
    id: String(item.id),
    title: a.titles.en_jp || a.titles.en || a.canonicalTitle || '',
    cover: a.posterImage?.large || a.posterImage?.medium || '',
    banner: a.coverImage?.large || a.coverImage?.original || a.posterImage?.large || '',
    year,
    genres: ['加载中...'], // Placeholder, will be populated on detail view
    synopsis: (a.synopsis || a.description || '暂无简介')
      .replace(/\[Written by MAL Rewrite\]/g, '')
      .replace(/\(Source: [^)]+\)/g, '')
      .trim(),
    rating,
    episodes: genEpisodes(a.episodeCount || 12, String(item.id)),
    updatedAt: a.startDate || new Date().toISOString(),
    isNew: a.status === 'current',
    status: a.status === 'current' ? 'airing' : a.status === 'finished' ? 'completed' : 'unknown',
  };
}

// Kitsu category mapping for browsing
// These are common categories with their IDs
const KITSU_CATEGORIES = [
  { label: '全部', id: '' },
  { label: '动作', id: '150' },
  { label: '冒险', id: '157' },
  { label: '喜剧', id: '160' },
  { label: '剧情', id: '173' },
  { label: '科幻', id: '216' },
  { label: '奇幻', id: '180' },
  { label: '恋爱', id: '213' },
  { label: '悬疑', id: '230' },
  { label: '恐怖', id: '188' },
  { label: '校园', id: '217' },
  { label: '机甲', id: '138' },
  { label: '体育', id: '113' }, // basketball as general sports
  { label: '日常', id: '221' },
  { label: '音乐', id: '143' },
];

export class KitsuSourceProvider implements AnimeSourceProvider {
  constructor(public readonly profile: SourceProfile) {}

  async fetchHome(page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      await rateLimit();
      const safeLimit = clampLimit(limit);
      const offset = (page - 1) * safeLimit;
      const res = await kitsuClient.get<KitsuResponse<KitsuAnimeItem>>('/anime', {
        params: {
          'page[limit]': safeLimit,
          'page[offset]': offset,
          sort: 'popularityRank',
        },
      });
      const items = res.data.data;
      return {
        data: items.map(mapAnimeSync),
        hasMore: !!res.data.links.next,
      };
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async fetchDetail(id: string): Promise<Anime | null> {
    try {
      await rateLimit();
      const res = await kitsuClient.get<{ data: KitsuAnimeItem }>(`/anime/${id}`);
      if (!res.data?.data) return null;
      return await mapAnime(res.data.data);
    } catch {
      return null;
    }
  }

  async search(query: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      await rateLimit();
      const safeLimit = clampLimit(limit);
      const offset = (page - 1) * safeLimit;
      const res = await kitsuClient.get<KitsuResponse<KitsuAnimeItem>>('/anime', {
        params: {
          'page[limit]': safeLimit,
          'page[offset]': offset,
          'filter[text]': query,
        },
      });
      return {
        data: res.data.data.map(mapAnimeSync),
        hasMore: !!res.data.links.next,
      };
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async getCategories(): Promise<string[]> {
    return KITSU_CATEGORIES.map(c => c.label);
  }

  async fetchByCategory(category: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    if (category === '全部') {
      return this.fetchHome(page, limit);
    }
    try {
      const catEntry = KITSU_CATEGORIES.find(c => c.label === category);
      if (!catEntry?.id) return { data: [], hasMore: false };

      await rateLimit();
      const safeLimit = clampLimit(limit);
      const offset = (page - 1) * safeLimit;
      const res = await kitsuClient.get<KitsuResponse<KitsuAnimeItem>>('/anime', {
        params: {
          'page[limit]': safeLimit,
          'page[offset]': offset,
          'filter[categories]': catEntry.id,
          sort: 'popularityRank',
        },
      });
      return {
        data: res.data.data.map(mapAnimeSync),
        hasMore: !!res.data.links.next,
      };
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async resolveVideoUrl(animeId: string, episodeNum: number): Promise<Source | null> {
    const sources = getSourcesForAnime(animeId, episodeNum);
    return sources[0] || null;
  }

  async resolveVideoSources(animeId: string, episodeNum: number): Promise<Source[]> {
    return getSourcesForAnime(animeId, episodeNum);
  }
}

// Pre-configured source profiles
export const KITSU_SOURCE_PROFILE: SourceProfile = {
  id: 'kitsu-api',
  name: 'Kitsu API',
  type: 'rest',
  description: 'Kitsu.io 官方API — 提供海量动漫元数据，更新及时，分类丰富',
  baseUrl: 'https://kitsu.io/api/edge',
  addedAt: Date.now(),
};
