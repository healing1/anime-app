import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@api_config';

export interface ApiConfig {
  baseURL: string;
}

let cached: ApiConfig = { baseURL: '' };

export async function loadApiConfig(): Promise<ApiConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch {}
  return cached;
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  cached = config;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getApiConfig(): ApiConfig {
  return cached;
}
