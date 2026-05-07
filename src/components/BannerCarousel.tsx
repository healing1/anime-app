import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import type { Anime } from '../types';

interface Props {
  data: Anime[];
  onPress: (anime: Anime) => void;
}

export default function BannerCarousel({ data, onPress }: Props) {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH, bannerHeight: BANNER_HEIGHT } = useResponsive();
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);
  const isManualScrolling = useRef(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchMoved = useRef(false);

  useEffect(() => {
    if (data.length <= 1) return;
    const timer = setInterval(() => {
      if (isManualScrolling.current) return;
      let next = currentIndex.current + 1;
      if (next >= data.length) next = 0;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      currentIndex.current = next;
      setDisplayIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [data.length]);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    currentIndex.current = index;
    setDisplayIndex(index);
    isManualScrolling.current = false;
  }, [SCREEN_WIDTH]);

  const onScrollBeginDrag = useCallback(() => {
    isManualScrolling.current = true;
  }, []);

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={item => item.id}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View
            style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
            onTouchStart={(e) => {
              touchStartX.current = e.nativeEvent.pageX;
              touchMoved.current = false;
            }}
            onTouchMove={() => {
              touchMoved.current = true;
            }}
            onTouchEnd={(e) => {
              if (!touchMoved.current && Math.abs(e.nativeEvent.pageX - touchStartX.current) < 10) {
                onPress(item);
              }
            }}
          >
            <Image
              source={{ uri: item.banner || item.cover }}
              style={[styles.banner, { width: SCREEN_WIDTH, height: BANNER_HEIGHT }]}
            />
            <View style={[styles.bottomGradient, { height: BANNER_HEIGHT * 0.55 }]} />
            <View style={styles.overlay}>
              <View style={styles.tagRow}>
                {item.isNew && (
                  <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                    <Text style={styles.tagText}>🔥 热播</Text>
                  </View>
                )}
                <View style={[styles.tag, { backgroundColor: colors.warning }]}>
                  <Text style={styles.tagText}>★ {item.rating}</Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.genres} numberOfLines={1}>
                {item.genres.join(' · ')} · {item.year}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {data.slice(0, 8).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === displayIndex ? colors.primary : 'rgba(255,255,255,0.45)' },
              i === displayIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  banner: {},
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlay: { position: 'absolute', bottom: 14, left: 16, right: 16 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  genres: { color: '#DDD', fontSize: 12, marginTop: 2 },
  dotsRow: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    flexDirection: 'row', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16, borderRadius: 3 },
});
