import axios from 'axios';
import type { Anime, Episode, Source } from '../types';

const BASE = 'https://api.jikan.moe/v4';
const JIKAN_MAX_LIMIT = 25; // Jikan API v4 hard limit

interface JikanAnimeItem {
  mal_id: number;
  title: string;
  images: { jpg: { large_image_url: string; image_url: string } };
  year?: number;
  aired?: { from: string };
  genres?: Array<{ name: string }>;
  synopsis?: string;
  score?: number;
  episodes?: number;
  status?: string;
}

interface JikanResponse<T> {
  data: T[];
  pagination: { has_next_page: boolean };
}

// 差异化视频源池 — 每个动漫根据ID哈希分配到不同的视频组合
// 公开测试视频，使用国内可访问的CDN地址
const VIDEO_POOL: Source[][] = [
  // 组 0: Sintel + 火山引擎
  [
    { label: '蓝光 1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '主线路' },
    { label: '高清 720p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'https://media.w3.org/2010/05/sintel/sintel-480p.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: 'CDN加速' },
  ],
  // 组 1: Oceans + BigBuckBunny
  [
    { label: '蓝光 1080p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: '主线路' },
    { label: '高清 720p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: 'CDN加速' },
  ],
  // 组 2: BigBuckBunny + Oceans
  [
    { label: '蓝光 1080p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '主线路' },
    { label: '高清 720p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: 'CDN加速' },
  ],
  // 组 3: 火山引擎 + Sintel
  [
    { label: '蓝光 1080p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '主线路' },
    { label: '高清 720p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: 'CDN加速' },
  ],
  // 组 4: W3C + 火山引擎
  [
    { label: '蓝光 1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '主线路' },
    { label: '高清 720p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: 'CDN加速' },
  ],
  // 组 5: Oceans + Sintel
  [
    { label: '蓝光 1080p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: '主线路' },
    { label: '高清 720p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: 'CDN加速' },
  ],
  // 组 6: BigBuckBunny + 火山引擎
  [
    { label: '蓝光 1080p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '主线路' },
    { label: '高清 720p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: 'CDN加速' },
  ],
  // 组 7: 全火山引擎变体
  [
    { label: '蓝光 1080p', url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server: '主线路' },
    { label: '高清 720p', url: 'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server: '备用线路1' },
    { label: '标清 480p', url: 'http://vjs.zencdn.net/v/oceans.mp4', server: '备用线路2' },
    { label: '流畅 360p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', server: 'CDN加速' },
  ],
];

// 根据动画ID哈希值选择视频源组（确保同一动画每集使用不同组的轮换）
function getSourcesForAnime(animeId: string, episodeNum: number): Source[] {
  // 将ID字符串转为数字哈希
  let hash = 0;
  for (let i = 0; i < animeId.length; i++) {
    hash = ((hash << 5) - hash) + animeId.charCodeAt(i);
    hash |= 0;
  }
  const groupIdx = Math.abs(hash + episodeNum) % VIDEO_POOL.length;
  return VIDEO_POOL[groupIdx];
}

function genEpisodes(count: number, animeId: string): Episode[] {
  const n = Math.min(count, 999);
  return Array.from({ length: n }, (_, i) => ({
    id: `${animeId}-ep${i + 1}`,
    num: i + 1,
    title: `第${i + 1}集`,
    thumbnail: `https://picsum.photos/seed/${animeId}ep${i + 1}/320/180`,
    sources: getSourcesForAnime(animeId, i + 1),
  }));
}

// English genre names from Jikan API → Chinese
const GENRE_CN: Record<string, string> = {
  Action: '动作', Adventure: '冒险', Comedy: '喜剧', Drama: '剧情',
  Fantasy: '奇幻', Horror: '恐怖', Mystery: '悬疑', Romance: '恋爱',
  'Sci-Fi': '科幻', 'Slice of Life': '日常', Sports: '体育',
  Supernatural: '超自然', Suspense: '悬疑', Thriller: '惊悚',
  Mecha: '机甲', Music: '音乐', School: '校园', Ecchi: '后宫',
  Historical: '历史', Military: '军事', Psychological: '心理',
  Seinen: '青年', Shounen: '少年', Shoujo: '少女', Isekai: '异世界',
  Game: '游戏', Parody: '搞笑', Samurai: '武士', 'Martial Arts': '武术',
  Vampire: '吸血鬼', Space: '太空', Police: '警匪', Dementia: '暗黑',
  Magic: '魔法', Demons: '妖魔', Josei: '女性向', Harem: '后宫',
  Kids: '少儿', Cars: '赛车', Gourmet: '美食', 'Avant Garde': '前卫',
  'Boys Love': 'BL', 'Girls Love': 'GL', 'Adult Cast': '成人向',
  Anthropomorphic: '拟人', CGDCT: '萌系', Childcare: '育儿',
  'Combat Sports': '格斗', Crossdressing: '伪娘', Delinquents: '不良',
  Detective: '侦探', Educational: '教育', 'Gag Humor': '搞笑',
  Gore: '血腥', Hentai: '限制级', 'High Stakes Game': '博弈',
  'Idols (Female)': '偶像', 'Idols (Male)': '男偶像', Iyashikei: '治愈',
  'Love Polygon': '多角恋', 'Magical Sex Shift': '性转',
  'Mahou Shoujo': '魔法少女', Medical: '医疗', Memoir: '回忆录',
  Mythology: '神话', 'Organized Crime': '黑帮', 'Otaku Culture': '御宅',
  'Performing Arts': '表演艺术', Pets: '宠物', Reincarnation: '转生',
  'Reverse Harem': '逆后宫', 'Romantic Subtext': '恋爱暗示',
  Showbiz: '演艺圈', 'Strategy Game': '策略游戏', 'Super Power': '超能力',
  Survival: '生存', 'Team Sports': '团队竞技', 'Time Travel': '时间旅行',
  'Video Game': '电子游戏', Villainess: '恶役千金',
  'Visual Arts': '视觉艺术', Workplace: '职场', 'Award Winning': '获奖作品',
  'Boys Love (Adapted)': 'BL', Erotica: '情色',
};

function translateGenre(name: string): string {
  return GENRE_CN[name] || name;
}

function mapAnime(item: JikanAnimeItem): Anime {
  const year = item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : 2024);
  return {
    id: String(item.mal_id),
    title: item.title,
    cover: item.images.jpg.large_image_url || item.images.jpg.image_url,
    banner: item.images.jpg.large_image_url || item.images.jpg.image_url,
    year: year || 2024,
    genres: item.genres?.map(g => translateGenre(g.name)) || ['其他'],
    synopsis: item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() || '暂无简介',
    rating: item.score ? Math.round(item.score * 10) / 10 : 7.0,
    episodes: genEpisodes(item.episodes || 12, String(item.mal_id)),
    updatedAt: item.aired?.from || new Date().toISOString(),
    isNew: item.status === 'Currently Airing',
    status: item.status === 'Currently Airing' ? 'airing' : item.status === 'Finished Airing' ? 'completed' : 'unknown',
  };
}

const jikanClient = axios.create({ baseURL: BASE, timeout: 10000 });

let requestQueue: Promise<void> = Promise.resolve();

function rateLimit(): Promise<void> {
  const next: Promise<void> = requestQueue.then(() => new Promise<void>(r => setTimeout(r, 400)));
  requestQueue = next;
  return next;
}

export async function fetchTopAnime(page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
  await rateLimit();
  const safeLimit = Math.min(limit, JIKAN_MAX_LIMIT);
  const res = await jikanClient.get<JikanResponse<JikanAnimeItem>>('/top/anime', { params: { page, limit: safeLimit } });
  return {
    data: res.data.data.map(mapAnime),
    hasMore: res.data.pagination.has_next_page,
  };
}

export async function fetchSeasonNow(): Promise<{ data: Anime[]; hasMore: boolean }> {
  await rateLimit();
  const res = await jikanClient.get<JikanResponse<JikanAnimeItem>>('/seasons/now');
  return {
    data: res.data.data.map(mapAnime),
    hasMore: res.data.pagination.has_next_page,
  };
}

export async function fetchAnimeById(id: string): Promise<Anime | null> {
  await rateLimit();
  try {
    const res = await jikanClient.get<{ data: JikanAnimeItem & { synopsis?: string; background?: string } }>(`/anime/${id}/full`);
    return mapAnime(res.data.data);
  } catch {
    return null;
  }
}

export async function fetchAnimeByGenre(genreId: number, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
  await rateLimit();
  const safeLimit = Math.min(limit, JIKAN_MAX_LIMIT);
  const res = await jikanClient.get<JikanResponse<JikanAnimeItem>>('/anime', {
    params: { genres: genreId, order_by: 'score', sort: 'desc', page, limit: safeLimit },
  });
  return {
    data: res.data.data.map(mapAnime),
    hasMore: res.data.pagination.has_next_page,
  };
}

export async function fetchAnimeByYear(year: number, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
  await rateLimit();
  const safeLimit = Math.min(limit, JIKAN_MAX_LIMIT);
  const res = await jikanClient.get<JikanResponse<JikanAnimeItem>>('/anime', {
    params: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, order_by: 'score', sort: 'desc', page, limit: safeLimit },
  });
  return {
    data: res.data.data.map(mapAnime),
    hasMore: res.data.pagination.has_next_page,
  };
}

export async function searchAnime(query: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
  await rateLimit();
  const safeLimit = Math.min(limit, JIKAN_MAX_LIMIT);
  const res = await jikanClient.get<JikanResponse<JikanAnimeItem>>('/anime', {
    params: { q: query, order_by: 'score', sort: 'desc', page, limit: safeLimit, sfw: true },
  });
  return {
    data: res.data.data.map(mapAnime),
    hasMore: res.data.pagination.has_next_page,
  };
}

// Genre mapping (Jikan genre IDs for our Chinese labels)
export const GENRE_MAP: { label: string; id: number }[] = [
  { label: '全部', id: 0 },
  { label: '动作', id: 1 },
  { label: '冒险', id: 2 },
  { label: '喜剧', id: 4 },
  { label: '科幻', id: 24 },
  { label: '奇幻', id: 10 },
  { label: '恋爱', id: 22 },
  { label: '悬疑', id: 7 },
  { label: '恐怖', id: 14 },
  { label: '校园', id: 23 },
  { label: '机甲', id: 18 },
  { label: '体育', id: 30 },
  { label: '日常', id: 36 },
  { label: '音乐', id: 19 },
];

// Year options: 1950 to 2026
export const YEAR_OPTIONS = (() => {
  const options = [{ label: '全部', value: 0 }];
  for (let y = 2026; y >= 2000; y--) options.push({ label: String(y), value: y });
  options.push({ label: '1990-1999', value: -3 });
  options.push({ label: '1980-1989', value: -4 });
  options.push({ label: '1970-1979', value: -5 });
  options.push({ label: '1960-1969', value: -6 });
  options.push({ label: '1950-1959', value: -7 });
  return options;
})();

export const YEAR_RANGES: Record<number, number[]> = {
  [-3]: [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999],
  [-4]: [1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989],
  [-5]: [1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979],
  [-6]: [1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969],
  [-7]: [1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959],
};
