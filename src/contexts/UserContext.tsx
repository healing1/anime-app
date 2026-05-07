import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaybackSettings } from '../types';

interface WatchHistoryItem {
  animeId: string;
  episodeId: string;
  timestamp: number;
  title?: string;
  cover?: string;
  episodeNum?: number;
}

interface UserContextType {
  following: string[];
  watchHistory: WatchHistoryItem[];
  playback: PlaybackSettings;
  apiBaseURL: string;
  introSkips: Record<string, number>;
  avatarUri: string;
  nickname: string;
  searchHistory: string[];
  toggleFollowing: (animeId: string) => void;
  isFollowing: (animeId: string) => boolean;
  addWatchHistory: (animeId: string, episodeId: string, meta?: { title?: string; cover?: string; episodeNum?: number }) => void;
  updatePlayback: (settings: Partial<PlaybackSettings>) => void;
  setApiBaseURL: (url: string) => void;
  setIntroSkip: (animeId: string, seconds: number) => void;
  setAvatar: (uri: string) => void;
  setNickname: (name: string) => void;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  clearCache: () => Promise<number>;
}

const defaultPlayback: PlaybackSettings = {
  defaultQuality: '720p',
  autoPlayNext: true,
  skipIntro: false,
  hardwareAccel: true,
};

const UserContext = createContext<UserContextType>({
  following: [],
  watchHistory: [],
  playback: defaultPlayback,
  apiBaseURL: '',
  introSkips: {},
  avatarUri: '',
  nickname: '',
  searchHistory: [],
  toggleFollowing: () => {},
  isFollowing: () => false,
  addWatchHistory: () => {},
  updatePlayback: () => {},
  setApiBaseURL: () => {},
  setIntroSkip: () => {},
  setAvatar: () => {},
  setNickname: () => {},
  addSearchHistory: () => {},
  clearSearchHistory: () => {},
  clearCache: async () => 0,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [following, setFollowing] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [playback, setPlayback] = useState<PlaybackSettings>(defaultPlayback);
  const [apiBaseURL, setApiBaseURLState] = useState('');
  const [introSkips, setIntroSkips] = useState<Record<string, number>>({});
  const [avatarUri, setAvatarUri] = useState('');
  const [nickname, setNicknameState] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const keys = ['@following', '@watch_history', '@playback', '@api_base_url', '@intro_skips', '@avatar_uri', '@nickname', '@search_history'];
      const [fw, wh, pb, url, skips, av, nick, sh] = await Promise.all(keys.map(k => AsyncStorage.getItem(k)));
      if (fw) setFollowing(JSON.parse(fw));
      if (wh) {
        const parsed = JSON.parse(wh);
        if (Array.isArray(parsed)) {
          // Aggressive cleanup: remove entries without a title OR with titles that look like IDs
          const isValidTitle = (t: any) => {
            if (!t || typeof t !== 'string' || t.trim().length === 0) return false;
            // Filter out titles that are just numbers, "动漫 {number}", or IDs
            if (/^\d+$/.test(t.trim())) return false;
            if (/^动漫\s*\d+$/.test(t.trim())) return false;
            return true;
          };
          const cleaned = parsed.filter((e: any) => e && isValidTitle(e.title));
          if (cleaned.length !== parsed.length) {
            AsyncStorage.setItem('@watch_history', JSON.stringify(cleaned));
          }
          setWatchHistory(cleaned);
        }
      }
      if (pb) setPlayback({ ...defaultPlayback, ...JSON.parse(pb) });
      if (url) setApiBaseURLState(url);
      if (skips) setIntroSkips(JSON.parse(skips));
      if (av) setAvatarUri(av);
      if (nick) setNicknameState(nick);
      if (sh) setSearchHistory(JSON.parse(sh));
    })();
  }, []);

  const toggleFollowing = useCallback((animeId: string) => {
    setFollowing(prev => {
      const next = prev.includes(animeId)
        ? prev.filter(id => id !== animeId)
        : [...prev, animeId];
      AsyncStorage.setItem('@following', JSON.stringify(next));
      return next;
    });
  }, []);

  const isFollowing = useCallback((animeId: string) => {
    return following.includes(animeId);
  }, [following]);

  const addWatchHistory = useCallback((animeId: string, episodeId: string, meta?: { title?: string; cover?: string; episodeNum?: number }) => {
    setWatchHistory(prev => {
      const existing = prev.find(h => h.animeId === animeId && h.episodeId === episodeId);
      const next = [
        { animeId, episodeId, timestamp: Date.now(), title: meta?.title ?? existing?.title, cover: meta?.cover ?? existing?.cover, episodeNum: meta?.episodeNum ?? existing?.episodeNum },
        ...prev.filter(h => !(h.animeId === animeId && h.episodeId === episodeId)),
      ].slice(0, 200);
      AsyncStorage.setItem('@watch_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const updatePlayback = useCallback((settings: Partial<PlaybackSettings>) => {
    setPlayback(prev => {
      const next = { ...prev, ...settings };
      AsyncStorage.setItem('@playback', JSON.stringify(next));
      return next;
    });
  }, []);

  const setApiBaseURL = useCallback((url: string) => {
    setApiBaseURLState(url);
    AsyncStorage.setItem('@api_base_url', url);
  }, []);

  const setIntroSkip = useCallback((animeId: string, seconds: number) => {
    setIntroSkips(prev => {
      const next = { ...prev, [animeId]: seconds };
      AsyncStorage.setItem('@intro_skips', JSON.stringify(next));
      return next;
    });
  }, []);

  const setAvatar = useCallback((uri: string) => {
    setAvatarUri(uri);
    AsyncStorage.setItem('@avatar_uri', uri);
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    AsyncStorage.setItem('@nickname', name);
  }, []);

  const addSearchHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(q => q !== query)].slice(0, 20);
      AsyncStorage.setItem('@search_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    AsyncStorage.removeItem('@search_history');
  }, []);

  const clearCache = useCallback(async () => {
    const keys = await AsyncStorage.getAllKeys();
    const savedKeys = ['@following', '@watch_history', '@theme_mode', '@playback', '@api_base_url', '@api_config', '@intro_skips', '@avatar_uri', '@nickname', '@search_history', '@source_profiles', '@active_source_id'];
    const toRemove = keys.filter(k => !savedKeys.includes(k));
    await Promise.all(toRemove.map(k => AsyncStorage.removeItem(k)));
    return toRemove.length;
  }, []);

  return (
    <UserContext.Provider value={{
      following, watchHistory, playback, apiBaseURL, introSkips, avatarUri, nickname, searchHistory,
      toggleFollowing, isFollowing, addWatchHistory,
      updatePlayback, setApiBaseURL, setIntroSkip, setAvatar, setNickname, addSearchHistory, clearSearchHistory, clearCache,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
