import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Image, Text, View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { fetchDoubanCover } from '../api/douban';
import { Ionicons } from '@expo/vector-icons';
import type { Anime } from '../types';

interface Props {
  anime: Anime;
  size?: 'grid' | 'horizontal';
  onPress: () => void;
  showEpisode?: boolean;
}

export default memo(function AnimeCard({ anime, size = 'grid', onPress, showEpisode }: Props) {
  const { colors } = useTheme();
  const { cardWidth, cardHeight, horizontalCardWidth, horizontalCardHeight } = useResponsive();
  const scale = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const [imgError, setImgError] = useState(false);
  const [doubanCover, setDoubanCover] = useState('');
  const fetchedRef = useRef(false);
  const hasEntered = useRef(false);

  const w = size === 'horizontal' ? horizontalCardWidth : cardWidth;
  const h = size === 'horizontal' ? horizontalCardHeight : cardHeight;

  const coverUri = doubanCover || anime.cover;

  useEffect(() => {
    if (!anime.cover && !fetchedRef.current && !imgError) {
      fetchedRef.current = true;
      fetchDoubanCover(anime.title).then(url => {
        if (url) setDoubanCover(url);
        else setImgError(true);
      });
    }
  }, [anime.cover, anime.title]);

  useEffect(() => {
    if (!hasEntered.current) {
      hasEntered.current = true;
      Animated.spring(entranceAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }).start();
    }
  }, []);

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 120, friction: 14 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  return (
    <Animated.View style={{
      transform: [
        { scale },
        { translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      ],
      opacity: entranceAnim,
      width: w,
      marginRight: size === 'horizontal' ? 12 : 0,
      marginBottom: 14,
    }}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      >
        {imgError ? (
          <View style={[styles.cover, { width: w, height: h, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={Math.min(w * 0.25, 36)} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 4, textAlign: 'center', paddingHorizontal: 6 }} numberOfLines={3}>
              {anime.title}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: coverUri }}
            style={[styles.cover, { width: w, height: h }]}
            onError={() => {
              if (doubanCover) {
                // Douban cover also failed, clear it
                setDoubanCover('');
              }
              setImgError(true);
            }}
          />
        )}
        {anime.status === 'airing' ? (
          <View style={[styles.badge, { backgroundColor: '#6C5CE7' }]}>
            <Text style={styles.badgeText}>连载中</Text>
          </View>
        ) : anime.status === 'completed' ? (
          <View style={[styles.badge, { backgroundColor: '#00B894' }]}>
            <Text style={styles.badgeText}>已完结</Text>
          </View>
        ) : anime.isNew ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>新番</Text>
          </View>
        ) : null}
        {showEpisode && anime.episodes.length > 0 && (
          <View style={[styles.epBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.epText}>{anime.episodes.length}集</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {anime.title}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.year, { color: colors.textTertiary }]}>{anime.year}</Text>
            <View style={styles.ratingRow}>
              <Text style={[styles.star, { color: colors.warning }]}>★</Text>
              <Text style={[styles.rating, { color: colors.warning }]}>{anime.rating}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cover: { borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#1A1A2E' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  epBadge: {
    position: 'absolute', bottom: 46, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
  },
  epText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '700', lineHeight: 18, letterSpacing: 0.2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  year: { fontSize: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontSize: 11 },
  rating: { fontSize: 11, fontWeight: '700' },
});
