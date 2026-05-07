import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CACHE_KEY = '@douban_cover_cache';
const CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 days
const PLACEHOLDER = '';

interface CacheEntry {
  url: string;
  time: number;
}

let cache: Record<string, CacheEntry> = {};
let cacheLoaded = false;

async function loadCache() {
  if (cacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {}
  cacheLoaded = true;
}

async function saveCache() {
  try {
    // Keep only last 500 entries
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const sorted = keys.sort((a, b) => cache[b].time - cache[a].time);
      const toKeep = sorted.slice(0, 500);
      const newCache: Record<string, CacheEntry> = {};
      for (const k of toKeep) newCache[k] = cache[k];
      cache = newCache;
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Rate limiter
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1200) {
    await new Promise(r => setTimeout(r, 1200 - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function fetchDoubanCover(title: string): Promise<string> {
  await loadCache();

  // Check cache
  const cached = cache[title];
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.url;
  }

  try {
    await rateLimit();

    // Search Douban movie API
    const searchRes = await axios.get('https://movie.douban.com/j/subject_suggest', {
      params: { q: cleanTitle(title) },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
      },
      timeout: 8000,
    });

    const results = searchRes.data;
    if (Array.isArray(results) && results.length > 0) {
      // Try exact-ish match first
      let match = results[0];
      const cleanQ = cleanTitle(title).toLowerCase();
      for (const r of results) {
        if (r.title && cleanTitle(r.title).toLowerCase() === cleanQ) {
          match = r;
          break;
        }
      }
      const img = match.img || match.pic?.normal || match.pic?.large || '';
      if (img) {
        const url = img.replace(/^http:/, 'https:');
        cache[title] = { url, time: Date.now() };
        await saveCache();
        return url;
      }
    }

    // No result found, cache the empty result to avoid repeated requests
    cache[title] = { url: PLACEHOLDER, time: Date.now() };
    await saveCache();
    return PLACEHOLDER;
  } catch {
    cache[title] = { url: PLACEHOLDER, time: Date.now() };
    await saveCache();
    return PLACEHOLDER;
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/第[一二三四五六七八九十\d]+季/g, '')
    .replace(/Season\s*\d+/gi, '')
    .replace(/Part\s*\d+/gi, '')
    .replace(/[:：].*$/, '')
    .replace(/[「」『』《》【】]/g, '')
    .trim();
}

export async function fetchDoubanSynopsis(title: string): Promise<string | null> {
  await loadCache();

  try {
    await rateLimit();

    const searchRes = await axios.get('https://movie.douban.com/j/subject_suggest', {
      params: { q: cleanTitle(title) },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
      },
      timeout: 8000,
    });

    const results = searchRes.data;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Get the best-matching subject
    const subjectId = results[0].id || results[0].episode;
    if (!subjectId) return null;

    // Fetch detail page via API
    const detailRes = await axios.get(`https://movie.douban.com/subject/${subjectId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/',
      },
      timeout: 10000,
    });

    const html: string = detailRes.data;

    // Try meta description first
    const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (metaMatch) {
      const desc = metaMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();
      // Strip leading boilerplate like "XXX的剧情简介"
      const cleaned = desc.replace(/^.+\s*的剧情简介[：:]\s*/, '').trim();
      if (cleaned.length > 30) return cleaned;
    }

    // Try v:summary span
    const summaryMatch = html.match(/<span\s[^>]*property="v:summary"[^>]*>([\s\S]*?)<\/span>/i);
    if (summaryMatch) {
      const text = summaryMatch[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (text.length > 10) return text;
    }

    return null;
  } catch {
    return null;
  }
}

export async function clearDoubanCache() {
  cache = {};
  cacheLoaded = true;
  await AsyncStorage.removeItem(CACHE_KEY);
}
