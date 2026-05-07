import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SourceProfile } from './sourceTypes';
import { createSourceProvider } from './sourceProvider';
import type { AnimeSourceProvider } from './sourceTypes';
import { FFZY_TVBOX_SOURCE, LIANGZI_TVBOX_SOURCE, ALL_BUILTIN_SOURCES } from './builtinSource';

const STORAGE_KEY_SOURCES = '@source_profiles';
const STORAGE_KEY_ACTIVE = '@active_source_id';

// ── Source Registry ──

class SourceRegistry {
  private providers: Map<string, AnimeSourceProvider> = new Map();
  private activeId: string | null = null;
  private initialized = false;

  /** Initialize the registry: load persisted sources + register all built-in defaults */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register all built-in sources
    for (const profile of ALL_BUILTIN_SOURCES) {
      this.registerProfile(profile);
    }

    // Load persisted sources
    const profiles = await this.loadProfiles();
    for (const profile of profiles) {
      const alreadyRegistered = ALL_BUILTIN_SOURCES.some(b => b.id === profile.id);
      if (!alreadyRegistered) {
        this.registerProfile(profile);
      }
    }

    // Set active source — default to 非凡影视
    const savedActiveId = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedActiveId && this.providers.has(savedActiveId)) {
      this.activeId = savedActiveId;
    } else {
      this.activeId = FFZY_TVBOX_SOURCE.id;
    }

    this.initialized = true;
  }

  /** Get active provider (ensures initialization) */
  async getActive(): Promise<AnimeSourceProvider> {
    await this.initialize();
    const provider = this.providers.get(this.activeId || FFZY_TVBOX_SOURCE.id);
    if (!provider) return this.providers.get(FFZY_TVBOX_SOURCE.id)!;
    return provider;
  }

  /** Get current active profile */
  async getActiveProfile(): Promise<SourceProfile | null> {
    await this.initialize();
    const provider = await this.getActive();
    return provider.profile;
  }

  /** Set active source by ID */
  async setActive(id: string): Promise<boolean> {
    await this.initialize();
    if (!this.providers.has(id)) return false;
    this.activeId = id;
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE, id);
    return true;
  }

  /** Get all registered profiles */
  async getAllProfiles(): Promise<SourceProfile[]> {
    await this.initialize();
    return Array.from(this.providers.values()).map(p => p.profile);
  }

  /** Register a profile (internal use) */
  private registerProfile(profile: SourceProfile): void {
    if (this.providers.has(profile.id)) return;
    try {
      const provider = createSourceProvider(profile);
      this.providers.set(profile.id, provider);
    } catch { /* skip invalid profiles */ }
  }

  /** Import a source from URL (JSON format) */
  async importFromURL(url: string): Promise<{ success: boolean; profile?: SourceProfile; error?: string }> {
    await this.initialize();
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: 请求失败` };
      }
      const json = await response.json();

      // Detect format and parse
      const profile = this.parseSourceProfile(json);
      if (!profile) {
        return { success: false, error: '无法识别的源格式，请提供有效的源配置JSON' };
      }

      // Generate ID if missing
      if (!profile.id) {
        profile.id = `source-${Date.now()}`;
      }
      profile.addedAt = Date.now();

      // Register
      this.registerProfile(profile);

      // Persist
      const profiles = await this.loadProfiles();
      const existing = profiles.findIndex(p => p.id === profile.id);
      if (existing >= 0) {
        profiles[existing] = profile;
      } else {
        profiles.push(profile);
      }
      await this.saveProfiles(profiles);

      // Auto-activate
      await this.setActive(profile.id);

      return { success: true, profile };
    } catch (e: any) {
      return { success: false, error: `导入失败: ${e.message?.slice(0, 80) || '未知错误'}` };
    }
  }

  /** Remove a source (cannot remove built-in default) */
  async removeSource(id: string): Promise<boolean> {
    await this.initialize();
    if (id === FFZY_TVBOX_SOURCE.id) return false;

    this.providers.delete(id);
    const profiles = await this.loadProfiles();
    await this.saveProfiles(profiles.filter(p => p.id !== id));

    // If active was removed, switch to default
    if (this.activeId === id) {
      await this.setActive(FFZY_TVBOX_SOURCE.id);
    }
    return true;
  }

  /** Detect if URL looks like a TVBox/AppleCMS API */
  private isTvboxUrl(url: string): boolean {
    return /api\.php|videolist|vod_play|ac=|vod_id|provide\/vod/i.test(url);
  }

  /** Parse various JSON formats into SourceProfile */
  private parseSourceProfile(json: any): SourceProfile | null {
    // Format 1: Direct SourceProfile JSON
    if (json.type && (json.type === 'builtin' || json.type === 'rest' || json.type === 'kitsu' || json.type === 'tvbox') && json.name) {
      return {
        id: json.id || `source-${Date.now()}`,
        name: json.name,
        type: json.type,
        description: json.description,
        baseUrl: json.baseUrl,
        endpoints: json.endpoints,
        config: json.config,
        addedAt: Date.now(),
      };
    }

    // Format 1.5: TVBox config with "api" field (common in Chinese sources)
    if (json.api && typeof json.api === 'string') {
      return {
        id: `source-${Date.now()}`,
        name: json.name || json.site_name || 'TVBox源',
        type: 'tvbox',
        baseUrl: json.api,
        endpoints: {},
        config: json.config || {},
        addedAt: Date.now(),
      };
    }

    // Format 2: Multi-repo format {"urls": [...]} — deprecated, treat as individual sources
    if (json.urls && Array.isArray(json.urls)) {
      // Take first URL as a REST source
      const first = json.urls[0];
      if (first && first.url) {
        const url = first.url;
        const isTvbox = this.isTvboxUrl(url);
        return {
          id: `source-${Date.now()}`,
          name: first.name || (isTvbox ? 'TVBox源' : '导入源'),
          type: isTvbox ? 'tvbox' : 'rest',
          baseUrl: url,
          endpoints: isTvbox ? {} : {
            home: '/home',
            detail: '/detail/:id',
            search: '/search',
            categories: '/categories',
            categoryData: '/category',
            videoUrl: '/play',
            videoSources: '/sources',
          },
          config: json.config || {},
          addedAt: Date.now(),
        };
      }
    }

    // Format 3: Single URL string (bare TVBox/REST source)
    if (json.url && typeof json.url === 'string') {
      const url = json.url;
      const isTvbox = this.isTvboxUrl(url);
      return {
        id: `source-${Date.now()}`,
        name: json.name || (isTvbox ? 'TVBox源' : '自定义源'),
        type: isTvbox ? 'tvbox' : 'rest',
        baseUrl: url,
        endpoints: json.endpoints || (isTvbox ? {} : undefined),
        config: json.config || {},
        addedAt: Date.now(),
      };
    }

    return null;
  }

  // ── Persistence ──

  private async loadProfiles(): Promise<SourceProfile[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SOURCES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveProfiles(profiles: SourceProfile[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(profiles));
  }
}

// Singleton
export const sourceRegistry = new SourceRegistry();

// Re-export for convenience
export { FFZY_TVBOX_SOURCE, LIANGZI_TVBOX_SOURCE };
