import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, StatusBar, Animated, ActivityIndicator, Modal, Pressable, BackHandler, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { VideoView, useVideoPlayer, type VideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useResponsive } from '../hooks/useResponsive';
import SourceSelector from '../components/SourceSelector';
import CastSelector from '../components/CastSelector';
import EpisodeGrid from '../components/EpisodeGrid';
import HorizontalScroll from '../components/HorizontalScroll';
import VideoControls from '../components/VideoControls';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { fetchDoubanSynopsis } from '../api/douban';
import type { Episode, Source, Anime } from '../types';
import type { SourceProfile } from '../api/sourceTypes';

// Enable LayoutAnimation on Android (disabled by default)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Safe wrapper: silently catch "already released" native object errors
function safePlayerCall(fn: () => void) {
  try { fn(); } catch { /* native object may be released */ }
}

interface PlayerViewHandle {
  replace: (uri: string) => void;
  player: VideoPlayer | null;
}

interface PlayerViewProps {
  source: string;
  playerWidth: number;
  playerHeight: number;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onBack: () => void;
  allSources: Source[];
  currentSourceUrl: string;
  onSourceChange: (source: Source) => void;
  safeTop: number;
}

const PlayerView = forwardRef<PlayerViewHandle, PlayerViewProps>(function PlayerView({
  source, playerWidth, playerHeight, isFullscreen, onFullscreenToggle, onBack, allSources, currentSourceUrl, onSourceChange, safeTop,
}, ref) {
  const player = useVideoPlayer({ uri: source }, p => {
    p.loop = false;
    safePlayerCall(() => p.play());
  });
  const [showSourcePopover, setShowSourcePopover] = useState(false);

  useImperativeHandle(ref, () => ({
    replace: (uri: string) => { safePlayerCall(() => player.replace({ uri })); },
    player,
  }), [player]);

  const prevSource = useRef(source);
  useEffect(() => {
    if (prevSource.current !== source) {
      prevSource.current = source;
      safePlayerCall(() => player.replace({ uri: source }));
    }
  }, [source, player]);

  // #2: Ensure auto-play on mount (some devices block autoplay in constructor)
  useEffect(() => {
    const timer = setTimeout(() => {
      safePlayerCall(() => player.play());
    }, 300);
    return () => clearTimeout(timer);
  }, [player]);

  useEffect(() => {
    return () => {
      safePlayerCall(() => player?.pause());
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [player]);

  return (
    <View style={[styles.playerBox, { width: playerWidth, height: playerHeight }]}>
      <VideoView
        player={player}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        nativeControls={false}
        allowsFullscreen={false}
        contentFit="contain"
      />
      <VideoControls
        player={player}
        playerWidth={playerWidth}
        playerHeight={playerHeight}
        isFullscreen={isFullscreen}
        onFullscreenToggle={onFullscreenToggle}
        onBack={onBack}
        onSourceSwitch={() => setShowSourcePopover(prev => !prev)}
        safeTop={safeTop}
      />

      {showSourcePopover && isFullscreen && (
        <Pressable style={styles.sourcePopoverOverlay} onPress={() => setShowSourcePopover(false)}>
          <View style={styles.sourcePopover}>
            <Text style={styles.sourcePopoverTitle}>切换线路</Text>
            {allSources.map((s, i) => {
              const active = s.url === currentSourceUrl;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.sourcePopoverItem, { backgroundColor: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)' }]}
                  onPress={() => { onSourceChange(s); setShowSourcePopover(false); }}
                >
                  <Text style={[styles.sourcePopoverLabel, { color: active ? '#A5B4FC' : '#FFF' }]}>{s.label}</Text>
                  <Text style={styles.sourcePopoverServer}>{s.server}</Text>
                  {active && <Ionicons name="checkmark" size={16} color="#A5B4FC" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      )}
    </View>
  );
});

export default function PlayerScreen() {
  const { colors, isDark } = useTheme();
  const { following, toggleFollowing, addWatchHistory } = useUser();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, playerHeight: PLAYER_HEIGHT, isTablet, isPhone, isLandscape } = useResponsive();

  const animeId: string = route.params?.animeId || '1';
  const initialEpisodeId: string | undefined = route.params?.episodeId;
  const [anime, setAnime] = useState<Anime | null>(null);
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentSource, setCurrentSource] = useState<Source>({ label: '720p', url: '', server: '默认' });
  const [currentEpisode, setCurrentEpisode] = useState<Episode>({ id: '', num: 0, title: '', thumbnail: '', sources: [] });
  const [externalSources, setExternalSources] = useState<Source[]>([]);
  const [resolvingSources, setResolvingSources] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showCast, setShowCast] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(following.includes(animeId));
  const [showProviderSwitch, setShowProviderSwitch] = useState(false);
  const [availableSources, setAvailableSources] = useState<SourceProfile[]>([]);
  const [activeSourceProfile, setActiveSourceProfile] = useState<SourceProfile | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const playerRef = useRef<PlayerViewHandle>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // #5: Split layout — separate from fullscreen. Tablet enters with split, fullscreen button goes pure fullscreen
  const [isSplitLayout, setIsSplitLayout] = useState(false);

  const allSources = [...externalSources, ...currentEpisode.sources.filter(
    es => !externalSources.some(xs => xs.url === es.url)
  )];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const detail = await api.getAnimeDetail(animeId);
        if (detail) {
          setAnime(detail);
          const firstEp = detail.episodes[0];
          setCurrentEpisode(firstEp || { id: '', num: 0, title: '', thumbnail: '', sources: [] });

          if (!detail.synopsis || detail.synopsis === '暂无简介') {
            fetchDoubanSynopsis(detail.title).then(db => {
              if (db) setAnime(prev => prev ? { ...prev, synopsis: db } : prev);
            });
          }

          const targetEp = initialEpisodeId
            ? detail.episodes.find(ep => ep.id === initialEpisodeId) || firstEp
            : firstEp;
          if (targetEp) {
            setCurrentEpisode(targetEp);
            setResolvingSources(true);
            const extSources = await api.resolveVideoSources(animeId, targetEp.num);
            setExternalSources(extSources);
            if (extSources.length > 0) {
              setCurrentSource(extSources[0]);
            } else {
              setCurrentSource(targetEp.sources[0] || { label: '720p', url: '', server: '默认' });
            }
            setResolvingSources(false);
          } else {
            setCurrentSource({ label: '720p', url: '', server: '默认' });
          }
          setIsFollowing(following.includes(animeId));
        }
        const recsResult = await api.getAnimeList(1, 10);
        const recs = recsResult.data.filter((a: Anime) => a.id !== animeId).slice(0, 10);
        setRecommendations(recs.length > 0 ? recs : api.getRecommendations(animeId, 10));
      } catch {
        const recs = api.getRecommendations(animeId, 10);
        setRecommendations(recs);
      }
      setLoading(false);
    })();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, [animeId]);

  // #5: Tablet enters player → auto split layout (left video, right info)
  useEffect(() => {
    if (isTablet && isLandscape && !isFullscreen) {
      setIsSplitLayout(true);
    }
  }, [isTablet, isLandscape]);

  useEffect(() => {
    if (anime && currentEpisode.id) addWatchHistory(animeId, currentEpisode.id, { title: anime.title, cover: anime.cover, episodeNum: currentEpisode.num });
  }, [anime, animeId, currentEpisode.id, addWatchHistory]);

  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener(e => {
      const orientation = e.orientationInfo.orientation;
      const isLandscapeOrientation =
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      if (isPhone && isLandscapeOrientation) {
        setIsFullscreen(true);
      } else if (isPhone && !isLandscapeOrientation) {
        setIsFullscreen(false);
      }
    });
    return () => { ScreenOrientation.removeOrientationChangeListener(sub); };
  }, [isPhone]);

  // #1: Android back button → exit fullscreen or go back, never exit app
  useEffect(() => {
    const handler = () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        if (isTablet && isLandscape) {
          setIsSplitLayout(true);
        }
        ScreenOrientation.unlockAsync().catch(() => {});
        return true;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false; // let system handle (shouldn't happen normally)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => { sub.remove(); };
  }, [isFullscreen, navigation, isTablet, isLandscape]);

  // #6: Null check before replace to prevent crash
  const handleSourceChange = useCallback((source: Source) => {
    setCurrentSource(source);
    if (source.url && playerRef.current?.player) {
      playerRef.current.replace(source.url);
    }
  }, []);
  // #6: Wrap in try/catch to prevent crash on source resolution failure
  const handleEpisodeSelect = useCallback(async (ep: Episode) => {
    setCurrentEpisode(ep);
    setResolvingSources(true);
    try {
      const extSources = await api.resolveVideoSources(animeId, ep.num);
      setExternalSources(extSources);
      const newSource = extSources.length > 0 ? extSources[0] : ep.sources[0];
      setCurrentSource(newSource);
      if (newSource?.url) playerRef.current?.replace(newSource.url);
    } catch {
      // keep current source on failure
    }
    setResolvingSources(false);
    setShowEpisodes(false);
  }, [animeId]);
  const handleFollow = useCallback(() => { toggleFollowing(animeId); setIsFollowing(prev => !prev); }, [animeId, toggleFollowing]);
  const handleShare = useCallback(() => {
    if (!anime) return;
    Share.share({ message: `🔥 强力推荐《${anime.title}》！评分 ${anime.rating}，快来一起看吧！` });
  }, [anime]);
  // #7: Use replace instead of push — unmounts old player, pausing it
  const handleRecPress = useCallback((item: Anime) => { (navigation as any).replace('Player', { animeId: item.id }); }, [navigation]);

  // #5 & #9: Fullscreen toggle — phone goes direct fullscreen, tablet toggles between split and pure fullscreen
  const handleFullscreenToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isPhone) {
      // #9: Phone → direct fullscreen landscape, no split
      setIsFullscreen(prev => {
        const next = !prev;
        if (next) {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
        } else {
          ScreenOrientation.unlockAsync().catch(() => {});
        }
        return next;
      });
    } else {
      // #5: Tablet → toggle between split layout and pure fullscreen
      if (isSplitLayout) {
        // Currently split → go pure fullscreen
        setIsSplitLayout(false);
        setIsFullscreen(true);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      } else if (isFullscreen) {
        // Currently pure fullscreen → exit to split
        setIsFullscreen(false);
        setIsSplitLayout(true);
        ScreenOrientation.unlockAsync().catch(() => {});
      } else {
        // Normal → go to split layout (or fullscreen if already landscape)
        if (isLandscape) {
          setIsFullscreen(true);
          setIsSplitLayout(false);
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
        } else {
          setIsSplitLayout(true);
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
        }
      }
    }
  }, [isPhone, isSplitLayout, isFullscreen, isLandscape]);

  // #6: Wrap in try/catch to prevent crash
  const handleNextEpisode = useCallback(async () => {
    if (!anime) return;
    const nextEp = anime.episodes.find(ep => ep.num === currentEpisode.num + 1);
    if (nextEp) {
      try { await handleEpisodeSelect(nextEp); } catch { /* keep current state */ }
    }
  }, [anime, currentEpisode.num, handleEpisodeSelect]);

  const handleOpenProviderSwitch = useCallback(async () => {
    const sources = await api.getAvailableSources();
    const active = await api.getActiveSourceProfile();
    setAvailableSources(sources);
    setActiveSourceProfile(active);
    setShowProviderSwitch(true);
  }, []);

  const handleSwitchProvider = useCallback(async (profile: SourceProfile) => {
    setShowProviderSwitch(false);
    await api.setActiveSource(profile.id);
    setLoading(true);
    setShowEpisodes(false);
    try {
      let detail = await api.getAnimeDetail(animeId);
      if (!detail && anime) {
        const searchResult = await api.searchAnime(anime.title);
        const results = Array.isArray(searchResult) ? searchResult : searchResult.data;
        if (results.length > 0) detail = results[0];
      }
      if (detail) {
        setAnime(detail);
        const firstEp = detail.episodes[0];
        setCurrentEpisode(firstEp || { id: '', num: 0, title: '', thumbnail: '', sources: [] });
        if (firstEp) {
          setResolvingSources(true);
          const extSources = await api.resolveVideoSources(detail.id, firstEp.num);
          setExternalSources(extSources);
          setCurrentSource(extSources.length > 0 ? extSources[0] : firstEp.sources[0] || { label: '720p', url: '', server: '默认' });
          setResolvingSources(false);
        }
      }
    } catch { /* keep current state */ }
    setLoading(false);
  }, [animeId, anime]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textTertiary, marginTop: 12 }}>加载中...</Text>
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 100 }}>加载失败</Text>
      </View>
    );
  }

  // #5: Split layout = tablet landscape with split mode (not pure fullscreen)
  const showSplitLayout = isSplitLayout && isTablet && isLandscape;
  const playerW = showSplitLayout ? SCREEN_WIDTH * 0.65 : SCREEN_WIDTH;

  // #3 & #14: Default player height = 1/3 screen; fullscreen or split layout = full height
  const getPlayerH = () => {
    if (isFullscreen || showSplitLayout) return SCREEN_HEIGHT;
    return SCREEN_HEIGHT / 3;
  };
  const playerH = getPlayerH();

  const handleBack = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      if (isTablet && isLandscape) {
        setIsSplitLayout(true);
      }
      ScreenOrientation.unlockAsync().catch(() => {});
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Main');
    }
  };

  const renderPlayer = () => (
    <View style={[styles.playerContainer, { width: playerW, height: playerH }]}>
      {currentSource.url ? (
        <PlayerView
          ref={playerRef}
          source={currentSource.url}
          playerWidth={playerW}
          playerHeight={playerH}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreenToggle}
          onBack={handleBack}
          allSources={allSources}
          currentSourceUrl={currentSource.url}
          onSourceChange={handleSourceChange}
          safeTop={insets.top}
        />
      ) : (
        <View style={[styles.playerFallback, { width: playerW, height: playerH }]}>
          <Ionicons name="play-circle-outline" size={64} color="#444" />
          <Text style={{ color: '#666', marginTop: 10, fontSize: 14 }}>暂无视频源</Text>
        </View>
      )}
      {resolvingSources && (
        <View style={[styles.loadingOverlay, { width: playerW, height: playerH }]}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </View>
  );

  const renderContent = (compact?: boolean) => (
    <>
      <View style={[styles.titleBar, { backgroundColor: compact ? 'transparent' : colors.card }]}>
        <Text style={[styles.animeTitle, { color: colors.text }]} numberOfLines={1}>{anime.title}</Text>
        <Text style={[styles.epInfo, { color: colors.textTertiary }]}>第{currentEpisode.num}集 · {currentEpisode.title}</Text>
      </View>

      <View style={[styles.actionRow, { backgroundColor: compact ? 'transparent' : colors.card }]}>
        {[
          { icon: 'swap-horizontal', label: '换源', bg: colors.accentLight, color: colors.accent, onPress: handleOpenProviderSwitch },
          { icon: showEpisodes ? 'chevron-up' : 'list-outline', label: showEpisodes ? '收起' : '选集', bg: colors.primaryLight, color: colors.primary, onPress: () => setShowEpisodes(!showEpisodes) },
          { icon: isFollowing ? 'heart' : 'heart-outline', label: isFollowing ? '已追' : '追番', bg: isFollowing ? colors.primaryLight : colors.inputBg, color: isFollowing ? colors.primary : colors.textTertiary, onPress: handleFollow },
          { icon: 'share-social-outline', label: '分享', bg: colors.inputBg, color: colors.textSecondary, onPress: handleShare },
        ].map((btn, i) => (
          <TouchableOpacity key={i} style={styles.actionItem} onPress={btn.onPress} activeOpacity={0.6}>
            <View style={[styles.actionIcon, { backgroundColor: btn.bg }]}>
              <Ionicons name={btn.icon as any} size={20} color={btn.color} />
            </View>
            <Text style={[styles.actionText, { color: btn.label === '已追' ? colors.primary : colors.textSecondary }]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.nextRow, { backgroundColor: compact ? 'transparent' : colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primaryLight }]}
          onPress={handleNextEpisode}
          disabled={!anime || currentEpisode.num >= (anime.episodes.length || 0)}
        >
          <Ionicons name="play-forward" size={18} color={colors.primary} />
          <Text style={[styles.nextBtnText, { color: colors.primary }]}>
            {anime && currentEpisode.num >= anime.episodes.length ? '已是最后一集' : '下一集'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCast(true)} style={[styles.nextBtn, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="tv-outline" size={18} color={colors.success} />
          <Text style={[styles.nextBtnText, { color: colors.success }]}>投屏</Text>
        </TouchableOpacity>
      </View>

      {showEpisodes && (
        <Animated.View style={[styles.epSection, { backgroundColor: colors.card, opacity: fadeAnim }]}>
          <View style={styles.epHeader}>
            <Text style={[styles.epSectionTitle, { color: colors.text }]}>选集 (共 {anime.episodes.length} 集)</Text>
            <TouchableOpacity onPress={() => setShowEpisodes(false)}><Ionicons name="close-circle" size={22} color={colors.textTertiary} /></TouchableOpacity>
          </View>
          <EpisodeGrid episodes={anime.episodes} currentEpisodeId={currentEpisode.id} onSelect={handleEpisodeSelect} />
        </Animated.View>
      )}

      <Animated.View style={compact ? undefined : { transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>简介</Text>
          <Text numberOfLines={synopsisExpanded ? undefined : 3} style={[styles.synopsis, { color: colors.textSecondary }]}>{anime.synopsis}</Text>
          <TouchableOpacity onPress={() => setSynopsisExpanded(!synopsisExpanded)}>
            <Text style={[styles.expandText, { color: colors.primary }]}>{synopsisExpanded ? '收起' : '展开全部'}</Text>
          </TouchableOpacity>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}><Text style={[styles.tagText, { color: colors.primary }]}>{anime.year}</Text></View>
            {anime.genres.map(g => <View key={g} style={[styles.tag, { backgroundColor: colors.inputBg }]}><Text style={[styles.tagText, { color: colors.textSecondary }]}>{g}</Text></View>)}
            <View style={[styles.tag, { backgroundColor: colors.warning + '20' }]}><Text style={[styles.tagText, { color: colors.warning }]}>★ {anime.rating}</Text></View>
            <View style={[styles.tag, { backgroundColor: colors.inputBg }]}><Text style={[styles.tagText, { color: colors.textTertiary }]}>共{anime.episodes.length}集</Text></View>
          </View>
        </View>

        <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.sourceDot2, { backgroundColor: resolvingSources ? colors.warning : colors.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceLabel, { color: colors.text }]}>当前播放线路</Text>
              <Text style={[styles.sourceDetail, { color: colors.textTertiary }]}>
                {resolvingSources ? '正在获取源...' : `${currentSource.label} · ${currentSource.server}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowSource(true)} style={[styles.switchBtn, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.switchBtnText, { color: colors.primary }]}>切换线路</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.recSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle]}>猜你喜欢</Text>
          <HorizontalScroll data={recommendations} onPress={handleRecPress} />
        </View>
      </Animated.View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: isFullscreen ? '#000' : colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" hidden={isFullscreen} />
      {/* Player always in same tree position — prevents React remount on fullscreen toggle */}
      <View style={isFullscreen ? { flex: 1 } : undefined}>
        {renderPlayer()}
      </View>
      {!isFullscreen && !showSplitLayout && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} bounces={false} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      )}
      {/* Tablet split: right-side content panel (absolute overlay) */}
      {showSplitLayout && (
        <View style={[styles.splitPanel, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {renderContent(true)}
          </ScrollView>
        </View>
      )}
      <SourceSelector visible={showSource} sources={allSources} currentSource={currentSource.url} loading={resolvingSources} onSelect={handleSourceChange} onClose={() => setShowSource(false)} />
      <CastSelector visible={showCast} onClose={() => setShowCast(false)} />
      <Modal visible={showProviderSwitch} transparent animationType="slide" onRequestClose={() => setShowProviderSwitch(false)}>
        <Pressable style={styles.providerOverlay} onPress={() => setShowProviderSwitch(false)}>
          <Pressable style={[styles.providerSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.providerHandle, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.providerTitle, { color: colors.text }]}>切换数据源</Text>
            <Text style={[styles.providerHint, { color: colors.textTertiary }]}>选择不同的源提供动漫数据和视频</Text>
            <View style={{ gap: 8 }}>
              {availableSources.map(s => {
                const isActive = s.id === activeSourceProfile?.id;
                return (
                  <TouchableOpacity
                    key={s.id} activeOpacity={0.7}
                    onPress={() => handleSwitchProvider(s)}
                    style={[styles.providerItem, {
                      backgroundColor: isActive ? colors.primaryLight : colors.inputBg,
                      borderColor: isActive ? colors.primary : 'transparent',
                      borderWidth: isActive ? 1.5 : 0,
                    }]}
                  >
                    <View style={styles.providerLeft}>
                      <Ionicons name={isActive ? 'radio-button-on' : 'radio-button-off'} size={20} color={isActive ? colors.primary : colors.textTertiary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.providerName, { color: isActive ? colors.primary : colors.text }]}>{s.name}</Text>
                        <Text style={[styles.providerDesc, { color: colors.textTertiary }]}>
                          {s.type === 'tvbox' ? 'TVBox·视频源' : s.type === 'rest' ? 'REST·自定义' : `${s.type} · 源`}
                          {s.baseUrl ? ` · ${s.baseUrl.slice(0, 40)}` : ''}
                        </Text>
                      </View>
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  playerContainer: { backgroundColor: '#000' },
  playerBox: { backgroundColor: '#000', position: 'relative', overflow: 'hidden' as const },
  playerFallback: { backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  titleBar: { paddingHorizontal: 16, paddingVertical: 14 },
  animeTitle: { fontSize: 19, fontWeight: '700' },
  epInfo: { fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, marginHorizontal: 12, borderRadius: 16, marginTop: 6 },
  actionItem: { alignItems: 'center', gap: 5 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 11, fontWeight: '600' },
  epSection: { paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16 },
  epHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  epSectionTitle: { fontSize: 15, fontWeight: '700' },
  infoCard: { marginHorizontal: 16, marginTop: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  synopsis: { fontSize: 13, lineHeight: 21 },
  expandText: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  tagText: { fontSize: 11, fontWeight: '600' },
  sourceCard: { marginHorizontal: 16, marginTop: 10, padding: 16, borderRadius: 18, borderWidth: 1 },
  sourceDot2: { width: 8, height: 8, borderRadius: 4 },
  recSection: { marginHorizontal: 16, marginTop: 10, marginBottom: 32, padding: 16, borderRadius: 20, borderWidth: 1 },
  sourceLabel: { fontSize: 14, fontWeight: '600' },
  sourceDetail: { fontSize: 12, marginTop: 2 },
  switchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  switchBtnText: { fontSize: 13, fontWeight: '700' },
  nextRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, borderRadius: 16, marginTop: 6 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', flex: 1 },
  nextBtnText: { fontSize: 12, fontWeight: '600' },
  providerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  providerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  providerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  providerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  providerHint: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  providerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12 },
  providerLeft: { flexDirection: 'row', alignItems: 'center' },
  providerName: { fontSize: 14, fontWeight: '600' },
  providerDesc: { fontSize: 11, marginTop: 2 },
  sourcePopoverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sourcePopover: {
    position: 'absolute', top: 50, right: 12,
    width: 220, maxHeight: 300,
    backgroundColor: 'rgba(20,20,35,0.95)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sourcePopoverTitle: {
    color: '#FFF', fontSize: 14, fontWeight: '700',
    marginBottom: 8, textAlign: 'center',
  },
  sourcePopoverItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 8, marginBottom: 4, gap: 8,
  },
  sourcePopoverLabel: {
    fontSize: 13, fontWeight: '600', flex: 1,
  },
  sourcePopoverServer: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11,
  },
  splitPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '35%',
  },
});
