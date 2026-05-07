import axios from 'axios';
import { Platform } from 'react-native';
import type { Anime, Episode, Source } from '../types';
import type { SourceProfile, AnimeSourceProvider } from './sourceTypes';
import { fetchTopAnime, fetchSeasonNow, fetchAnimeById, fetchAnimeByGenre, fetchAnimeByYear, searchAnime as jikanSearch, GENRE_MAP } from './jikan';
import { getMockAnimeById } from './mockData';
import { KitsuSourceProvider } from './kitsuSource';

// CORS proxy for web development — get around Cloudflare/NoCORS
const CORS_PROXY = Platform.OS === 'web' ? 'http://localhost:9001/proxy?url=' : '';

// ── Accessible video URL pool (China-friendly CDN) ──

const VIDEO_POOL: Source[][] = [
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'主线路' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/sintel-480p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'主线路' },{ label:'高清 720p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'主线路' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'主线路' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'主线路' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function getSourcesForAnime(animeId: string, episodeNum: number): Source[] {
  return VIDEO_POOL[(hashStr(animeId) + episodeNum) % VIDEO_POOL.length];
}

// ── Default category list for built-in source ──

const DEFAULT_CATEGORIES = GENRE_MAP.map(g => g.label);

// ── Built-in source provider (Jikan metadata + accessible videos) ──

class BuiltinSourceProvider implements AnimeSourceProvider {
  constructor(public readonly profile: SourceProfile) {}

  async fetchHome(page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      return await fetchTopAnime(page, limit);
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async fetchDetail(id: string): Promise<Anime | null> {
    try {
      const result = await fetchAnimeById(id);
      if (result) {
        // Overwrite episode sources with diverse per-anime URLs
        result.episodes = result.episodes.map(ep => ({
          ...ep,
          sources: getSourcesForAnime(id, ep.num),
        }));
        return result;
      }
    } catch { /* fallback to mock */ }
    return getMockAnimeById(id) || null;
  }

  async search(query: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      return await jikanSearch(query, page, limit);
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async getCategories(): Promise<string[]> {
    return DEFAULT_CATEGORIES;
  }

  async fetchByCategory(category: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    if (category === '全部') {
      return this.fetchHome(page, limit);
    }
    try {
      const genreEntry = GENRE_MAP.find(g => g.label === category);
      if (genreEntry?.id) {
        return await fetchAnimeByGenre(genreEntry.id, page, limit);
      }
    } catch { /* fallback */ }
    return { data: [], hasMore: false };
  }

  async resolveVideoUrl(animeId: string, episodeNum: number): Promise<Source | null> {
    const sources = getSourcesForAnime(animeId, episodeNum);
    return sources[0] || null;
  }

  async resolveVideoSources(animeId: string, episodeNum: number): Promise<Source[]> {
    return getSourcesForAnime(animeId, episodeNum);
  }
}

// ── REST API source provider ──

class RestSourceProvider implements AnimeSourceProvider {
  private client;

  constructor(public readonly profile: SourceProfile) {
    this.client = axios.create({
      baseURL: profile.baseUrl || '',
      timeout: 12000,
    });
  }

  async fetchHome(page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      const ep = this.getEndpoint('home', '/home');
      const res = await this.client.get(ep, { params: { page, limit } });
      return this.normalizeListResponse(res.data);
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async fetchDetail(id: string): Promise<Anime | null> {
    try {
      const ep = this.getEndpoint('detail', '/detail');
      const res = await this.client.get(ep.replace(':id', id));
      return this.normalizeAnime(res.data);
    } catch {
      return null;
    }
  }

  async search(query: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      const ep = this.getEndpoint('search', '/search');
      const res = await this.client.get(ep, { params: { q: query, page, limit } });
      return this.normalizeListResponse(res.data);
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const ep = this.getEndpoint('categories', '/categories');
      const res = await this.client.get(ep);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  }

  async fetchByCategory(category: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      const ep = this.getEndpoint('categoryData', '/category');
      const res = await this.client.get(ep, { params: { cat: category, page, limit } });
      return this.normalizeListResponse(res.data);
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async resolveVideoUrl(animeId: string, episodeNum: number): Promise<Source | null> {
    try {
      const ep = this.getEndpoint('videoUrl', '/play');
      const res = await this.client.get(ep, { params: { id: animeId, ep: episodeNum } });
      return this.normalizeSource(res.data);
    } catch {
      return null;
    }
  }

  async resolveVideoSources(animeId: string, episodeNum: number): Promise<Source[]> {
    try {
      const ep = this.getEndpoint('videoSources', '/sources');
      const res = await this.client.get(ep, { params: { id: animeId, ep: episodeNum } });
      const data = res.data;
      if (Array.isArray(data)) return data.map(this.normalizeSource).filter(Boolean) as Source[];
      if (Array.isArray(data?.data)) return data.data.map(this.normalizeSource).filter(Boolean) as Source[];
      return [];
    } catch {
      return [];
    }
  }

  private getEndpoint(key: string, fallback: string): string {
    return this.profile.endpoints?.[key] || fallback;
  }

  private normalizeListResponse(data: any): { data: Anime[]; hasMore: boolean } {
    if (!data) return { data: [], hasMore: false };
    const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
    return {
      data: items.map((item: any) => this.normalizeAnime(item)).filter(Boolean) as Anime[],
      hasMore: data.hasMore ?? data.has_next_page ?? data.pagination?.has_next_page ?? false,
    };
  }

  private normalizeAnime(item: any): Anime {
    return {
      id: String(item.id || item.mal_id || ''),
      title: item.title || item.name || '',
      cover: item.cover || item.image || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
      banner: item.banner || item.cover || item.image || item.images?.jpg?.large_image_url || '',
      year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : new Date().getFullYear()),
      genres: Array.isArray(item.genres) ? item.genres.map((g: any) => g.name || g) : (item.genres || ['其他']),
      synopsis: (item.synopsis || item.description || '暂无简介').replace(/\[Written by MAL Rewrite\]/g, '').trim(),
      rating: item.rating || item.score || 7.0,
      episodes: Array.isArray(item.episodes)
        ? item.episodes.map((ep: any) => ({
            id: String(ep.id || ep.episodeId || ''),
            num: ep.num || ep.number || ep.episode || 1,
            title: ep.title || ep.name || `第${ep.num || ep.number || ep.episode || 1}集`,
            thumbnail: ep.thumbnail || ep.image || '',
            sources: Array.isArray(ep.sources) && ep.sources.length > 0 ? ep.sources : VIDEO_POOL[0],
          }))
        : [],
      updatedAt: item.updatedAt || item.aired?.from || new Date().toISOString(),
      isNew: item.isNew || item.status === 'Currently Airing',
      status: item.status === 'Currently Airing' ? 'airing'
        : item.status === 'Finished Airing' ? 'completed'
        : item.vod_remarks?.includes('完结') ? 'completed'
        : item.vod_remarks?.includes('连载') || item.vod_remarks?.includes('更新') ? 'airing'
        : 'unknown',
    };
  }

  private normalizeSource(item: any): Source | null {
    if (!item) return null;
    return {
      label: item.label || item.quality || item.name || '默认',
      url: item.url || item.src || item.video || '',
      server: item.server || item.source || '默认线路',
    };
  }
}

// ── TVBox (AppleCMS) source provider ──
// Supports standard AppleCMS API: /api.php/provide/vod/?ac=videolist&t=type_id&pg=1
// Response format: { code, msg, page, pagecount, total, list: [...] }
// vod_play_url format: label$url#label$url$$$source2_label$url#...

class TvboxSourceProvider implements AnimeSourceProvider {
  private client;
  private animeTypeId: number;

  constructor(public readonly profile: SourceProfile) {
    const baseURL = profile.baseUrl || '';
    // On web, use local CORS proxy to bypass Cloudflare
    if (CORS_PROXY && baseURL) {
      this.client = axios.create({ timeout: 15000 });
    } else {
      this.client = axios.create({ baseURL, timeout: 15000 });
    }
    this.animeTypeId = profile.config?.animeTypeId || 30; // 30 = 日韩动漫
  }

  private async get(path: string, params?: Record<string, any>) {
    if (CORS_PROXY) {
      // Build full URL and pass through CORS proxy
      const baseUrl = this.profile.baseUrl || '';
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const fullUrl = encodeURIComponent(baseUrl + path + qs);
      const res = await this.client.get(CORS_PROXY + fullUrl);
      return res.data;
    }
    return this.client.get(path, { params }).then(r => r.data);
  }

  // Parse AppleCMS response envelope
  private parseResponse(data: any): { list: any[]; page: number; pagecount: number; total: number } {
    if (!data) return { list: [], page: 1, pagecount: 0, total: 0 };
    return {
      list: data.list || [],
      page: parseInt(data.page, 10) || 1,
      pagecount: parseInt(data.pagecount, 10) || 0,
      total: parseInt(data.total, 10) || 0,
    };
  }

  // Parse vod_play_url + vod_play_from into per-source episodes
  //   vod_play_from: "liangzi$$$lzm3u8" (source names separated by $$$)
  //   vod_play_url:  "ep1$url1#ep2$url2$$$ep1$m3u8_1#ep2$m3u8_2"
  private parsePlayUrl(playUrl: string, playFrom: string): Array<{ name: string; episodes: Array<{ label: string; url: string }> }> {
    if (!playUrl) return [];
    const fromNames = playFrom ? playFrom.split('$$$') : [];
    const sourceBlocks = playUrl.split('$$$');
    return sourceBlocks.map((block, si) => {
      const pairs = block.split('#').filter(Boolean);
      if (pairs.length === 0) return null;
      const sourceName = fromNames[si] || `播放源${si + 1}`;
      const episodes: Array<{ label: string; url: string }> = [];

      for (const pair of pairs) {
        const parts = pair.split('$');
        if (parts.length === 1) {
          if (parts[0].startsWith('http')) {
            episodes.push({ label: `第${episodes.length + 1}集`, url: parts[0] });
          }
        } else if (parts.length === 2) {
          if (parts[1] && /^https?:\/\//.test(parts[1])) {
            episodes.push({ label: parts[0], url: parts[1] });
          }
        } else if (parts.length >= 3) {
          // SourceName$Label$URL  format
          const urlPart = parts[parts.length - 1];
          const labelPart = parts[parts.length - 2];
          if (urlPart && /^https?:\/\//.test(urlPart)) {
            episodes.push({ label: labelPart, url: urlPart });
          }
        }
      }
      return { name: sourceName, episodes };
    }).filter(Boolean) as Array<{ name: string; episodes: Array<{ label: string; url: string }> }>;
  }

  private mapVodItem(item: any): Anime {
    const playFrom = item.vod_play_from || '';
    const playUrl = item.vod_play_url || '';
    const playData = this.parsePlayUrl(playUrl, playFrom);

    // Also parse vod_down_url for direct mp4 downloads
    const downFrom = item.vod_down_from || '';
    const downUrl = item.vod_down_url || '';
    if (downUrl) {
      const downData = this.parsePlayUrl(downUrl, downFrom);
      for (const ds of downData) {
        const existing = playData.find(s => s.name === ds.name);
        if (!existing) {
          playData.push(ds);
        } else {
          // Merge download episodes into existing source
          for (let i = 0; i < ds.episodes.length; i++) {
            if (!existing.episodes[i]?.url && ds.episodes[i]?.url) {
              existing.episodes[i] = ds.episodes[i];
            }
          }
        }
      }
    }

    // Prefer direct mp4/m3u8 sources over share redirect URLs (they have CORS headers & play directly)
    playData.sort((a, b) => {
      const aHasDirect = a.episodes.some(e => e.url && /\.(m3u8|mp4)(\?|$)/.test(e.url));
      const bHasDirect = b.episodes.some(e => e.url && /\.(m3u8|mp4)(\?|$)/.test(e.url));
      if (aHasDirect && !bHasDirect) return -1;
      if (!aHasDirect && bHasDirect) return 1;
      return 0;
    });

    // Build episodes: each column in playData.episodes[i] is episode i
    const maxEps = Math.max(...playData.map(s => s.episodes.length), 0);
    const episodes: Episode[] = Array.from({ length: maxEps }, (_, i) => {
      const sources: Source[] = playData.map(s => {
        const ep = s.episodes[i];
        return ep?.url ? { label: ep.label || s.name, url: ep.url, server: s.name } : null;
      }).filter(Boolean) as Source[];
      const firstEp = playData[0]?.episodes[i];
      return {
        id: `${item.vod_id}-ep${i + 1}`,
        num: i + 1,
        title: firstEp?.label || `第${i + 1}集`,
        thumbnail: item.vod_pic || '',
        sources,
      };
    });

    const content = item.vod_content || item.vod_blurb || '暂无简介';
    return {
      id: String(item.vod_id || ''),
      title: item.vod_name || '',
      cover: item.vod_pic || '',
      banner: item.vod_pic || '',
      year: parseInt(item.vod_year, 10) || new Date().getFullYear(),
      genres: item.vod_class ? item.vod_class.split(/[,，/]/) : (item.type_name ? [item.type_name] : ['其他']),
      synopsis: content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '').trim(),
      rating: parseFloat(item.vod_score) || parseFloat(item.vod_douban_score) || 7.0,
      episodes,
      updatedAt: item.vod_time ? new Date(item.vod_time).toISOString() : new Date().toISOString(),
      isNew: item.vod_remarks?.includes('更新') || item.vod_remarks?.includes('连载') || false,
      status: item.vod_remarks?.includes('完结') ? 'completed'
        : item.vod_remarks?.includes('连载') || item.vod_remarks?.includes('更新') ? 'airing'
        : 'unknown',
    };
  }

  async fetchHome(page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      const data = await this.get('', { ac: 'videolist', t: this.animeTypeId, pg: page });
      const parsed = this.parseResponse(data);
      const items = parsed.list;
      return {
        data: items.map((item: any) => this.mapVodItem(item)),
        hasMore: page < parsed.pagecount,
      };
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async fetchDetail(id: string): Promise<Anime | null> {
    try {
      const data = await this.get('', { ac: 'videolist', ids: id });
      const parsed = this.parseResponse(data);
      const item = parsed.list[0];
      if (!item) return null;
      return this.mapVodItem(item);
    } catch {
      return null;
    }
  }

  async search(query: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    try {
      const data = await this.get('', { ac: 'videolist', wd: query, pg: page });
      const parsed = this.parseResponse(data);
      const items = parsed.list;
      return {
        data: items.map((item: any) => this.mapVodItem(item)),
        hasMore: page < parsed.pagecount,
      };
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const data = await this.get('', { ac: 'list' });
      const classes = data?.class || [];
      if (Array.isArray(classes)) {
        return classes.map((c: any) => c.type_name || c.name || String(c));
      }
      return [];
    } catch {
      return [];
    }
  }

  async fetchByCategory(category: string, page = 1, limit = 24): Promise<{ data: Anime[]; hasMore: boolean }> {
    if (category === '全部') return this.fetchHome(page, limit);
    try {
      // Find the type_id for this category name from the class list
      let typeId: number | null = null;
      try {
        const listData = await this.get('', { ac: 'list' });
        const classes = listData?.class || [];
        const found = classes.find((c: any) => c.type_name === category);
        if (found) typeId = parseInt(found.type_id, 10);
      } catch { /* ignore */ }

      if (typeId) {
        // Exact match found — filter by type_id
        const data = await this.get('', { ac: 'videolist', t: typeId, pg: page });
        const parsed = this.parseResponse(data);
        return {
          data: parsed.list.map((item: any) => this.mapVodItem(item)),
          hasMore: page < parsed.pagecount,
        };
      } else {
        // No matching type_id — use keyword search within anime type
        const data = await this.get('', { ac: 'videolist', t: this.animeTypeId, wd: category, pg: page });
        const parsed = this.parseResponse(data);
        return {
          data: parsed.list.map((item: any) => this.mapVodItem(item)),
          hasMore: page < parsed.pagecount,
        };
      }
    } catch {
      return { data: [], hasMore: false };
    }
  }

  async resolveVideoUrl(animeId: string, episodeNum: number): Promise<Source | null> {
    const sources = await this.resolveVideoSources(animeId, episodeNum);
    return sources[0] || null;
  }

  async resolveVideoSources(animeId: string, episodeNum: number): Promise<Source[]> {
    try {
      const data = await this.get('', { ac: 'videolist', ids: animeId });
      const parsed = this.parseResponse(data);
      const item = parsed.list[0];
      if (!item) return [];

      // Parse both play_url and down_url
      const playFrom = item.vod_play_from || '';
      const playUrl = item.vod_play_url || '';
      const playData = this.parsePlayUrl(playUrl, playFrom);

      const downFrom = item.vod_down_from || '';
      const downUrl = item.vod_down_url || '';
      if (downUrl) {
        const downData = this.parsePlayUrl(downUrl, downFrom);
        for (const ds of downData) {
          const existing = playData.find(s => s.name === ds.name);
          if (!existing) playData.push(ds);
        }
      }

      // Sort: prefer m3u8/mp4 sources over share redirect URLs
      playData.sort((a, b) => {
        const aDirect = a.episodes.some(e => e.url && /\.(m3u8|mp4)(\?|$)/.test(e.url));
        const bDirect = b.episodes.some(e => e.url && /\.(m3u8|mp4)(\?|$)/.test(e.url));
        if (aDirect && !bDirect) return -1;
        if (!aDirect && bDirect) return 1;
        return 0;
      });

      const result: Source[] = [];
      for (const srcBlock of playData) {
        const ep = srcBlock.episodes[episodeNum - 1];
        if (ep?.url) {
          result.push({ label: ep.label, url: ep.url, server: srcBlock.name });
        }
      }
      return result;
    } catch {
      return [];
    }
  }
}

// ── Factory ──

export function createSourceProvider(profile: SourceProfile): AnimeSourceProvider {
  switch (profile.type) {
    case 'builtin':
      return new BuiltinSourceProvider(profile);
    case 'rest':
      return new RestSourceProvider(profile);
    case 'kitsu':
      return new KitsuSourceProvider(profile);
    case 'tvbox':
      return new TvboxSourceProvider(profile);
    default:
      return new BuiltinSourceProvider(profile);
  }
}
