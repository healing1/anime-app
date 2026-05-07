import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { api } from '../api/client';
import AnimeCard from '../components/AnimeCard';
import { Ionicons } from '@expo/vector-icons';
import type { Anime } from '../types';

export default function FollowingScreen() {
  const { colors } = useTheme();
  const { following } = useUser();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (following.length === 0) {
      setAnimeList([]);
      setLoading(false);
      return;
    }
    const results: Anime[] = [];
    for (const id of following.slice(0, 50)) {
      try {
        const detail = await api.getAnimeDetail(id);
        if (detail) results.push(detail);
      } catch { /* skip */ }
    }
    setAnimeList(results);
    setLoading(false);
  }, [following]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>我在追</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : animeList.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>还没有在追的动漫</Text>
        </View>
      ) : (
        <FlatList
          data={animeList}
          keyExtractor={item => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 14 }}
          renderItem={({ item }) => (
            <AnimeCard anime={item} size="grid" onPress={() => navigation.navigate('Player', { animeId: item.id })} />
          )}
          removeClippedSubviews windowSize={7} maxToRenderPerBatch={8} initialNumToRender={6}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
});
