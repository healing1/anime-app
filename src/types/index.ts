export interface Source {
  label: string;
  url: string;
  server: string;
}

export interface Episode {
  id: string;
  num: number;
  title: string;
  thumbnail: string;
  sources: Source[];
}

export interface Anime {
  id: string;
  title: string;
  cover: string;
  banner: string;
  year: number;
  genres: string[];
  synopsis: string;
  rating: number;
  episodes: Episode[];
  isNew?: boolean;
  status: 'airing' | 'completed' | 'unknown';
  updatedAt: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface PlaybackSettings {
  defaultQuality: string;
  autoPlayNext: boolean;
  skipIntro: boolean;
  hardwareAccel: boolean;
}

export interface UserPreferences {
  following: string[];
  watchHistory: { animeId: string; episodeId: string; timestamp: number }[];
  theme: ThemeMode;
  playback: PlaybackSettings;
  apiBaseURL: string;
  introSkips: Record<string, number>;
  avatarUri: string;
  nickname: string;
  searchHistory: string[];
}

export interface CastDevice {
  id: string;
  name: string;
  type: 'chromecast' | 'airplay' | 'dlna' | 'smarttv';
}
