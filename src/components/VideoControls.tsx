import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Animated, PanResponder, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VideoPlayer } from 'expo-video';

function safePlayer(fn: () => void) {
  try { fn(); } catch { /* native object may be released */ }
}

interface VideoControlsProps {
  player: VideoPlayer;
  playerWidth: number;
  playerHeight: number;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onBack: () => void;
  onSourceSwitch?: () => void;
  safeTop?: number;
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const RATES = [1, 1.5, 2];

export default function VideoControls({
  player, playerWidth, playerHeight, isFullscreen, onFullscreenToggle, onBack, onSourceSwitch, safeTop = 0,
}: VideoControlsProps) {
  const playerRef = useRef(player);
  playerRef.current = player; // always point to latest player, prevents stale closure crash

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const centerOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeeking = useRef(false);
  const durationRef = useRef(0);
  const [seekFraction, setSeekFraction] = useState(0);
  const barWidth = useRef(0);
  const barLeft = useRef(0);

  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressOpacity = useRef(new Animated.Value(0)).current;
  const savedRate = useRef(1);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // #13: Double-tap detection
  const lastTapRef = useRef(0);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(controlsOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(centerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start(() => setShowControls(false));
    }, 4000);
  }, [controlsOpacity, centerOpacity]);

  const show = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(centerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (player.playing) scheduleHide();
  }, [controlsOpacity, centerOpacity, player, scheduleHide]);

  // #8: Manual hide — animate controls out
  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.timing(controlsOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(centerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setShowControls(false));
  }, [controlsOpacity, centerOpacity]);

  // Enable timeUpdate events (disabled by default!)
  // Listen to player events: playingChange, timeUpdate, sourceLoad
  useEffect(() => {
    safePlayer(() => { player.timeUpdateEventInterval = 0.25; });

    const onPlayingChange = (e: { isPlaying: boolean }) => {
      setIsPlaying(e.isPlaying);
      if (e.isPlaying && showControls) scheduleHide();
    };
    const onTime = (e: { currentTime: number }) => {
      if (!isSeeking.current) {
        setCurrentTime(e.currentTime);
        const d = player.duration;
        durationRef.current = d;
        setDuration(d);
      }
    };
    // sourceLoad fires once when video metadata is ready — get duration early
    const onSourceLoad = (e: { duration: number }) => {
      durationRef.current = e.duration;
      setDuration(e.duration);
    };
    let sub1: any, sub2: any, sub3: any;
    safePlayer(() => {
      sub1 = player.addListener('playingChange', onPlayingChange);
      sub2 = player.addListener('timeUpdate', onTime);
      sub3 = player.addListener('sourceLoad', onSourceLoad);
    });

    // Sync initial state
    setIsPlaying(player.playing);
    setCurrentTime(player.currentTime);
    const d = player.duration;
    durationRef.current = d;
    setDuration(d);
    setPlaybackRate(player.playbackRate);

    return () => {
      sub1?.remove();
      sub2?.remove();
      sub3?.remove();
    };
  }, [player, scheduleHide, showControls]);

  // Initial auto-hide
  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (player.playing) { safePlayer(() => player.pause()); }
    else { safePlayer(() => player.play()); }
    show();
  }, [player, show]);

  const handleSpeed = useCallback(() => {
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length];
    safePlayer(() => { player.playbackRate = next; });
    setPlaybackRate(next);
    show();
  }, [player, playbackRate, show]);

  // #12: Long press → 2x speed with pitch preservation
  const handlePressIn = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      savedRate.current = player.playbackRate;
      safePlayer(() => {
        try { (player as any).preservesPitch = true; } catch { /* not supported */ }
        player.playbackRate = 2;
      });
      setPlaybackRate(2);
      setIsLongPressing(true);
      Animated.timing(longPressOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }, 500);
  }, [player, longPressOpacity]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPressing) {
      safePlayer(() => { player.playbackRate = savedRate.current; });
      setPlaybackRate(savedRate.current);
      Animated.timing(longPressOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setIsLongPressing(false);
      });
    }
  }, [isLongPressing, player, longPressOpacity]);

  const progressFromEvent = (evt: GestureResponderEvent) => {
    const x = evt.nativeEvent.pageX - barLeft.current;
    return Math.max(0, Math.min(1, x / (barWidth.current || 1)));
  };

  // Track component mount state so we never seek on an unmounted player
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const barPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      try {
        if (!mountedRef.current) return;
        if (durationRef.current <= 0 || !isFinite(durationRef.current)) return;
        isSeeking.current = true;
        const f = progressFromEvent(evt);
        setSeekFraction(f);
        setCurrentTime(f * durationRef.current);
      } catch { /* silently ignore — component may be unmounting */ }
    },
    onPanResponderMove: (evt) => {
      try {
        if (!isSeeking.current || !mountedRef.current) return;
        const f = progressFromEvent(evt);
        setSeekFraction(f);
        setCurrentTime(f * durationRef.current);
      } catch { /* ignore */ }
    },
    onPanResponderRelease: (evt) => {
      try {
        if (!isSeeking.current || !mountedRef.current) return;
        const f = progressFromEvent(evt);
        const d = durationRef.current;
        const p = playerRef.current;
        if (d > 0 && isFinite(d) && isFinite(f) && p) {
          const target = f * d;
          if (isFinite(target) && target >= 0) {
            // Verify player is still alive before seeking (read a property to test native handle)
            let playerAlive = false;
            try {
              const testDuration = p.duration;
              playerAlive = isFinite(testDuration) && testDuration > 0;
            } catch {
              playerAlive = false;
            }
            if (playerAlive && mountedRef.current) {
              safePlayer(() => { p.currentTime = target; });
              setCurrentTime(target);
            }
          }
        }
        setSeekFraction(f);
        isSeeking.current = false;
        show();
      } catch {
        // PanResponder fired after unmount — silently ignore
        isSeeking.current = false;
      }
    },
  })).current;

  const progress = durationRef.current > 0 ? (isSeeking.current ? seekFraction : currentTime / durationRef.current) : 0;

  const containerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: playerWidth,
    height: playerHeight,
  };

  const fullSize: any = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: playerWidth,
    height: playerHeight,
  };

  return (
    <Pressable
      style={containerStyle}
      onPress={() => {
        // #13: Double-tap → play/pause toggle
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          handleTogglePlay();
          return;
        }
        lastTapRef.current = now;
        // #8: Single tap → toggle controls (show if hidden, hide if shown)
        if (showControls) { hide(); }
        else { show(); }
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={0}
    >
      {/* Controls overlay */}
      <Animated.View
        style={[fullSize, { opacity: controlsOpacity }]}
        pointerEvents="box-none"
      >
        {/* Control buttons only active when visible */}
        <View pointerEvents={showControls ? 'auto' : 'none'} style={fullSize}>
          {/* Center play/pause button */}
          <Animated.View style={[fullSize, styles.centerContent, { opacity: centerOpacity }]} pointerEvents="box-none">
            <TouchableOpacity onPress={handleTogglePlay} style={styles.playBtn}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color="#FFF"
                style={{ marginLeft: isPlaying ? 0 : 4 }}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: safeTop + 6 }]}>
            <TouchableOpacity onPress={onBack} style={styles.topBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {isFullscreen && onSourceSwitch && (
              <TouchableOpacity onPress={onSourceSwitch} style={styles.topBtn}>
                <Ionicons name="swap-horizontal" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <View style={styles.progressRow}>
              <View
                style={styles.trackHitArea}
                ref={(r) => {
                  if (r) r.measure((_x, _y, w, _h, px) => { barWidth.current = w; barLeft.current = px; });
                }}
                {...barPan.panHandlers}
              >
                <View style={styles.trackBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
                  <View style={[styles.thumb, { left: `${Math.min(100, progress * 100)}%` }]} />
                </View>
              </View>
            </View>
            <View style={styles.controlRow}>
              <Text style={styles.timeText}>{fmtTime(currentTime)} / {fmtTime(duration)}</Text>
              <View style={styles.rightControls}>
                <TouchableOpacity onPress={handleSpeed} style={styles.bottomBtn}>
                  <Text style={styles.speedText}>{playbackRate}x</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onFullscreenToggle} style={styles.bottomBtn}>
                  <Ionicons
                    name={isFullscreen ? 'contract' : 'expand'}
                    size={20}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* 2x speed overlay — small pill at top-center */}
      <Animated.View
        style={[styles.speed2xContainer, { opacity: longPressOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.speed2xPill}>
          <Ionicons name="play-forward" size={12} color="#FFF" />
          <Text style={styles.speed2xText}>2x 倍速播放中</Text>
        </View>
      </Animated.View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 20,
  },
  topBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 8, paddingTop: 20,
  },
  progressRow: {
    marginBottom: 2,
    paddingVertical: 4,
  },
  trackHitArea: {
    height: 28,
    justifyContent: 'center',
  },
  trackBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    overflow: 'visible' as const,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: -2,
    bottom: -2,
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginLeft: -6,
    top: -4,
  },
  controlRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  timeText: {
    color: '#FFF', fontSize: 12, fontVariant: ['tabular-nums'],
    opacity: 0.9,
  },
  rightControls: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  bottomBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  speedText: {
    color: '#FFF', fontSize: 11, fontWeight: '700',
  },
  speed2xContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  speed2xPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'center',
  },
  speed2xText: {
    color: '#FFF', fontSize: 11, fontWeight: '600',
  },
});
