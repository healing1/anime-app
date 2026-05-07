import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const STORAGE_KEY_REPO_URL = '@source_repo_url';
const STORAGE_KEY_SITES = '@source_sites';
const STORAGE_KEY_ACTIVE_SITE = '@active_site';

export interface SourceSite {
  url: string;
  name: string;
  addedAt: number;
}

// Parse multi-repo JSON: {"urls":[{"url":"...","name":"..."}]}
export async function importFromURL(repoURL: string): Promise<{ sites: SourceSite[]; error?: string }> {
  try {
    const res = await axios.get(repoURL, { timeout: 12000 });
    const json = res.data;

    if (!json || !Array.isArray(json.urls)) {
      return { sites: [], error: 'JSON格式错误：缺少 urls 数组' };
    }

    const newSites: SourceSite[] = [];
    for (const item of json.urls) {
      if (item.url && item.name) {
        newSites.push({ url: item.url.trim(), name: item.name.trim(), addedAt: Date.now() });
      }
    }

    if (newSites.length === 0) {
      return { sites: [], error: '未找到有效的站点URL' };
    }

    // Save repo URL
    await AsyncStorage.setItem(STORAGE_KEY_REPO_URL, repoURL);

    // Merge with existing sites (deduplicate by url)
    const existing = await getSavedSites();
    const merged = [...existing];
    for (const s of newSites) {
      if (!merged.find(e => e.url === s.url)) {
        merged.push(s);
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(merged));

    return { sites: merged };
  } catch (e: any) {
    if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
      return { sites: [], error: '请求超时，请检查URL或网络' };
    }
    if (e.response?.status) {
      return { sites: [], error: `HTTP ${e.response.status}：服务器返回错误` };
    }
    return { sites: [], error: `网络错误：${e.message?.slice(0, 60) || '未知错误'}` };
  }
}

export async function getSavedSites(): Promise<SourceSite[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getSavedRepoURL(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY_REPO_URL)) || '';
  } catch {
    return '';
  }
}

export async function addSite(site: SourceSite): Promise<SourceSite[]> {
  const sites = await getSavedSites();
  if (!sites.find(s => s.url === site.url)) {
    sites.push({ ...site, addedAt: Date.now() });
    await AsyncStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
  }
  return sites;
}

export async function removeSite(url: string): Promise<SourceSite[]> {
  let sites = await getSavedSites();
  sites = sites.filter(s => s.url !== url);
  await AsyncStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
  return sites;
}

export async function setActiveSite(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_SITE, url);
}

export async function getActiveSite(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_SITE)) || '';
  } catch {
    return '';
  }
}

export async function clearAllSites(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY_SITES, STORAGE_KEY_REPO_URL, STORAGE_KEY_ACTIVE_SITE]);
}
