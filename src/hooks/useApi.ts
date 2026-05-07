import { useState, useEffect, useCallback } from 'react';
import type { Anime } from '../types';
import { api } from '../api/client';

export function useAnimeList() {
  const [data, setData] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetch = useCallback(async (pageNum: number, append = false) => {
    try {
      const result = await api.getAnimeList(pageNum);
      setData(prev => append ? [...prev, ...result.data] : result.data);
      setHasMore(result.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(1);
  }, [fetch]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetch(1);
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetch(next, true);
  }, [hasMore, loading, page, fetch]);

  return { data, loading, refreshing, hasMore, refresh, loadMore };
}

export function useAnimeDetail(id: string) {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAnimeDetail(id).then(result => {
      setAnime(result);
      setLoading(false);
    });
  }, [id]);

  return { anime, loading };
}
