import React, { useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AnimeCard from './AnimeCard';
import type { Anime } from '../types';

interface Props {
  data: Anime[];
  onPress: (anime: Anime) => void;
  emptyText?: string;
}

export default function HorizontalScroll({ data, onPress, emptyText }: Props) {
  const { colors } = useTheme();

  const renderItem = useCallback(({ item, index }: { item: Anime; index: number }) => (
    <View style={[index === 0 && { marginLeft: 0 }]}>
      <AnimeCard anime={item} size="horizontal" onPress={() => onPress(item)} />
    </View>
  ), [onPress]);

  const keyExtractor = useCallback((item: Anime) => item.id, []);

  if (data.length === 0 && emptyText) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={renderItem}
      removeClippedSubviews
      windowSize={3}
      maxToRenderPerBatch={8}
      initialNumToRender={4}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingLeft: 16, paddingRight: 4, paddingBottom: 4 },
  empty: {
    marginHorizontal: 16, paddingVertical: 24, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, marginBottom: 8,
  },
});
