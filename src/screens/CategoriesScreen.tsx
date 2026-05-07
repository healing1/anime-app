import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import AnimeCard from '../components/AnimeCard';
import { api, GENRE_LIST, YEAR_OPTIONS, YEAR_RANGES } from '../api/client';
import type { Anime } from '../types';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { gridColumns, gridPadding, gridGap, headerFontSize } = useResponsive();
  const categories = GENRE_LIST;
  const [selectedGenre, setSelectedGenre] = useState('全部');
  const [selectedYear, setSelectedYear] = useState(0);
  const [data, setData] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetch = useCallback(async (genre: string, year: number, pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let result: { data: Anime[]; hasMore: boolean };

      if (year < 0 && YEAR_RANGES[year]) {
        // Year range: fetch all years in range (only for page 1, no pagination within ranges)
        const allResults: Anime[] = [];
        for (const y of YEAR_RANGES[year]) {
          const r = genre === '全部'
            ? await api.getAnimeList(1, 25)
            : await api.getAnimeByGenre(genre, 1, 25);
          allResults.push(...r.data.filter((a: Anime) => genre === '全部' || a.genres.includes(genre)));
        }
        // Filter by year range client-side since API may not support year filters
        const filtered = allResults.filter((a: Anime) => YEAR_RANGES[year].includes(a.year));
        // Deduplicate
        const seen = new Set<string>();
        const deduped = filtered.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
        result = { data: deduped, hasMore: false };
      } else if (year > 0) {
        // Specific year: use API with year filter, genre as secondary filter
        if (genre === '全部') {
          result = await api.getAnimeByYear(year, pageNum, 25);
        } else {
          // API may not support both genre+year, so fetch by genre and filter client-side
          const r = await api.getAnimeByGenre(genre, pageNum, 25);
          result = {
            data: r.data.filter((a: Anime) => a.year === year),
            hasMore: r.hasMore,
          };
        }
      } else if (genre !== '全部') {
        result = await api.getAnimeByGenre(genre, pageNum, 25);
      } else {
        result = await api.getAnimeList(pageNum, 25);
      }

      if (append) {
        // Deduplicate when appending
        const existingIds = new Set(data.map(a => a.id));
        const newItems = result.data.filter(a => !existingIds.has(a.id));
        setData(prev => [...prev, ...newItems]);
      } else {
        setData(result.data);
      }
      setHasMore(result.hasMore);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (e) {
      console.error(e);
      if (!append) setData([]);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [data, fadeAnim]);

  // Reset page and re-fetch when genre or year changes
  useEffect(() => {
    fadeAnim.setValue(0);
    setPage(1);
    fetch(selectedGenre, selectedYear, 1, false);
  }, [selectedGenre, selectedYear]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetch(selectedGenre, selectedYear, nextPage, true);
  }, [page, hasMore, loadingMore, selectedGenre, selectedYear, fetch]);

  const handleGenreChange = useCallback((genre: string) => {
    if (genre !== selectedGenre) setSelectedGenre(genre);
  }, [selectedGenre]);

  const handleYearChange = useCallback((year: number) => {
    if (year !== selectedYear) setSelectedYear(year);
  }, [selectedYear]);

  const handlePress = (anime: Anime) => navigation.navigate('Player', { animeId: anime.id });

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>加载更多...</Text>
        </View>
      );
    }
    if (hasMore && data.length > 0) {
      return (
        <TouchableOpacity
          style={[styles.loadMoreBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={handleLoadMore}
          activeOpacity={0.7}
        >
          <Text style={[styles.loadMoreText, { color: colors.primary }]}>加载更多</Text>
        </TouchableOpacity>
      );
    }
    if (data.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>— 已经到底了 —</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: headerFontSize }]}>分类探索</Text>
      </View>

      <View style={[styles.filterSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>类型</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity key="全部" activeOpacity={0.7} onPress={() => handleGenreChange('全部')}
            style={[styles.chip, { backgroundColor: '全部' === selectedGenre ? colors.primary : colors.inputBg, borderColor: '全部' === selectedGenre ? colors.primary : 'transparent', borderWidth: '全部' === selectedGenre ? 1.5 : 0 }]}>
            <Text style={[styles.chipText, { color: '全部' === selectedGenre ? '#FFF' : colors.textSecondary }]}>全部</Text>
          </TouchableOpacity>
          {categories.filter(c => c !== '全部').map(cat => {
            const active = cat === selectedGenre;
            return (
              <TouchableOpacity key={cat} activeOpacity={0.7} onPress={() => handleGenreChange(cat)}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.inputBg, borderColor: active ? colors.primary : 'transparent', borderWidth: active ? 1.5 : 0 }]}>
                <Text style={[styles.chipText, { color: active ? '#FFF' : colors.textSecondary }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, { color: colors.textTertiary, marginTop: 10 }]}>年代</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {YEAR_OPTIONS.map(opt => {
            const active = opt.value === selectedYear;
            return (
              <TouchableOpacity key={opt.label} activeOpacity={0.7} onPress={() => handleYearChange(opt.value)}
                style={[styles.chip, { backgroundColor: active ? colors.accent : colors.inputBg, borderColor: active ? colors.accent : 'transparent', borderWidth: active ? 1.5 : 0 }]}>
                <Text style={[styles.chipText, { color: active ? '#FFF' : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: colors.textSecondary }]}>
          找到 <Text style={{ color: colors.primary, fontWeight: '700' }}>{data.length}</Text> 部作品
        </Text>
      </View>

      {data.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>没有找到符合条件的动漫</Text>
        </View>
      ) : loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>加载中...</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            key={`grid-${gridColumns}`}
            data={data} keyExtractor={item => item.id} numColumns={gridColumns} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: gridPadding, paddingBottom: 20 }}
            columnWrapperStyle={gridColumns > 1 ? { gap: gridGap, marginBottom: 0 } : undefined}
            renderItem={({ item }) => <AnimeCard anime={item} size="grid" showEpisode onPress={() => handlePress(item)} />}
            ListFooterComponent={renderFooter}
            removeClippedSubviews windowSize={7} maxToRenderPerBatch={8} initialNumToRender={6}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 12, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  filterSection: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  filterLabel: { fontSize: 11, fontWeight: '600', paddingHorizontal: 20, marginBottom: 6 },
  filterRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', paddingBottom: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '600' },
  resultBar: { paddingHorizontal: 20, paddingVertical: 10 },
  resultText: { fontSize: 13, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  footerText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  footerEnd: { paddingVertical: 20 },
  loadMoreBtn: {
    marginHorizontal: 20, marginVertical: 16,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700' },
});
