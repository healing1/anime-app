import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, TextInput, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useResponsive } from '../hooks/useResponsive';
import SectionHeader from '../components/SectionHeader';
import HorizontalScroll from '../components/HorizontalScroll';
import AnimeCard from '../components/AnimeCard';
import BannerCarousel from '../components/BannerCarousel';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import type { Anime } from '../types';
import type { SourceProfile } from '../api/sourceTypes';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { following, searchHistory, addSearchHistory, clearSearchHistory } = useUser();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { gridColumns, gridPadding, gridGap, cardWidth, headerFontSize, sectionFontSize, isTablet } = useResponsive();

  const [recent, setRecent] = useState<Anime[]>([]);
  const [trending, setTrending] = useState<Anime[]>([]);
  const [bannerData, setBannerData] = useState<Anime[]>([]);
  const [followed, setFollowed] = useState<Anime[]>([]);
  const [activeSource, setActiveSource] = useState<SourceProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedQuery = useRef('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      // Fetch 3 pages for ~50+ anime (TVBox returns ~20/page, Jikan returns 25/page)
      const [p1, p2, p3, sourceProfile] = await Promise.allSettled([
        api.getAnimeList(1, 25),
        api.getAnimeList(2, 25),
        api.getAnimeList(3, 25),
        api.getActiveSourceProfile(),
      ]);
      const allResults: Anime[] = [];
      [p1, p2, p3].forEach(r => {
        if (r.status === 'fulfilled') allResults.push(...r.value.data);
      });
      // Deduplicate by ID
      const seen = new Set<string>();
      const top = allResults.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

      if (sourceProfile.status === 'fulfilled') setActiveSource(sourceProfile.value);
      setTrending(top.slice(0, isTablet ? 36 : 24));
      setRecent([...top].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 12));
      setBannerData(top.filter((a: Anime) => a.rating >= 8.7).slice(0, 8));
    } catch {
      setTrending(api.getTrending());
      setRecent(api.getRecentUpdates());
      setBannerData(api.getTrending().filter((a: Anime) => a.rating >= 8.7).slice(0, 6));
    }
    try {
      setFollowed(await api.getFollowing(following));
    } catch {
      setFollowed([]); // silent fail, show empty
    }
  }, [following, isTablet]);

  useFocusEffect(useCallback(() => {
    load();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [load]));

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 1) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true); setSearching(true);
    // Debounce history save: only save >= 500ms after last keystroke
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const query = text.trim();
    searchTimer.current = setTimeout(() => {
      if (query.length >= 1 && query !== lastSavedQuery.current) {
        addSearchHistory(query);
        lastSavedQuery.current = query;
      }
    }, 600);
    try {
      const result = await api.searchAnime(text.trim());
      setSearchResults(Array.isArray(result) ? result : result.data);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, [addSearchHistory]);

  const handleHistoryTap = useCallback((query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  }, [handleSearch]);

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); };

  const handleFocus = () => {
    setSearchFocused(true);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setSearchFocused(false), 200);
  };

  const handlePress = (anime: Anime) => navigation.navigate('Player', { animeId: anime.id });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: headerFontSize }]}>Animer</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SourceManage')} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[styles.sourceDot, { backgroundColor: activeSource && activeSource.id !== 'builtin-default' ? colors.success : colors.warning }]} />
            <Text style={[styles.sourceTag, { color: activeSource && activeSource.id !== 'builtin-default' ? colors.primary : colors.textTertiary }]} numberOfLines={1}>
              {activeSource ? activeSource.name : '未选择源'}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.headerBg }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="搜索动漫..." placeholderTextColor={colors.textTertiary}
            value={searchQuery} onChangeText={handleSearch} returnKeyType="search"
            onFocus={handleFocus} onBlur={handleBlur} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity>
          )}
        </View>
      </View>
      {(searchFocused || searchQuery.length > 0) && searchHistory.length > 0 && searchQuery.length === 0 && (
        <View style={[styles.historyDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>搜索历史</Text>
            <TouchableOpacity onPress={clearSearchHistory} style={styles.historyClearBtn}>
              <Text style={[styles.historyClearText, { color: colors.textTertiary }]}>清空</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyChips}>
            {searchHistory.slice(0, 12).map((q, i) => (
              <TouchableOpacity key={i} style={[styles.historyChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => handleHistoryTap(q)}>
                <Ionicons name="time-outline" size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.historyChipText, { color: colors.textSecondary }]} numberOfLines={1}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showSearch ? (
        <View style={{ flex: 1 }}>
          {searching ? (
            <View style={styles.status}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.statusText, { color: colors.textTertiary }]}>搜索中...</Text></View>
          ) : searchResults.length === 0 ? (
            <View style={styles.status}><Ionicons name="search-outline" size={48} color={colors.textTertiary} /><Text style={[styles.statusText, { color: colors.textTertiary }]}>未找到相关动漫</Text></View>
          ) : (
            <FlatList
              key={`search-${gridColumns}`}
              data={searchResults} keyExtractor={item => item.id} numColumns={gridColumns} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: gridPadding, paddingBottom: 20 }}
              columnWrapperStyle={gridColumns > 1 ? { gap: gridGap, marginBottom: 14 } : undefined}
              renderItem={({ item }) => <AnimeCard anime={item} size="grid" showEpisode onPress={() => { clearSearch(); handlePress(item); }} />}
              removeClippedSubviews windowSize={7} maxToRenderPerBatch={8} initialNumToRender={6}
            />
          )}
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={[{ key: 'banner' }, { key: 'recent' }, { key: 'following' }]}
            keyExtractor={s => s.key} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} />}
            removeClippedSubviews windowSize={5} maxToRenderPerBatch={4} initialNumToRender={3}
            renderItem={({ item }) => {
              if (item.key === 'banner') return <View style={{ marginBottom: 12 }}><BannerCarousel data={bannerData} onPress={handlePress} /></View>;
              if (item.key === 'recent') return (
                <View style={{ marginBottom: 4 }}>
                  <SectionHeader title="最近更新" onSeeAll={() => recent.length > 0 && navigation.navigate('Categories')} />
                  <HorizontalScroll data={recent} onPress={handlePress} emptyText="暂无更新内容" />
                </View>
              );
              if (item.key === 'following') return (
                <View style={{ marginBottom: 4 }}>
                  <SectionHeader title="我在追" onSeeAll={() => followed.length > 0 && navigation.navigate('Categories')} />
                  <HorizontalScroll data={followed} onPress={handlePress} emptyText="还没有在追的动漫，快去发现吧" />
                </View>
              );
              return null;
            }}
            ListFooterComponent={() => (
              <View style={{ marginVertical: 8, marginBottom: 20 }}>
                <SectionHeader title="为你推荐" />
                <View style={[styles.grid, { paddingHorizontal: gridPadding, gap: gridGap }]}>
                  {trending.map(anime => <AnimeCard key={anime.id} anime={anime} size="grid" showEpisode onPress={() => handlePress(anime)} />)}
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  sourceTag: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  sourceDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: 20 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8, paddingVertical: 0 },
  status: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  statusText: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  historyDropdown: {
    marginHorizontal: 16, marginTop: 2, marginBottom: 4,
    borderRadius: 14, borderWidth: 1,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyTitle: { fontSize: 12, fontWeight: '600' },
  historyClearBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  historyClearText: { fontSize: 12 },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  historyChipText: { fontSize: 13 },
  historyClear: { padding: 6, marginLeft: 6, marginTop: 2 },
});
