import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeMode } from '../types';

const options: { label: string; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: '浅色', value: 'light', icon: 'sunny-outline' },
  { label: '深色', value: 'dark', icon: 'moon-outline' },
  { label: '跟随系统', value: 'system', icon: 'phone-portrait-outline' },
];

const optionIndex: Record<ThemeMode, number> = { light: 0, dark: 1, system: 2 };

export default memo(function ThemeToggle() {
  const { mode, setMode, colors } = useTheme();
  const pillLeft = useRef(new Animated.Value(optionIndex[mode])).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scales = useRef(options.map(() => new Animated.Value(1))).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  // Pill width in pixels (container minus 4px padding on each side, divided by 3)
  const pillW = containerWidth > 0 ? (containerWidth - 8) / 3 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, []);

  useEffect(() => {
    if (pillW <= 0) return;
    Animated.spring(pillLeft, {
      toValue: optionIndex[mode] * pillW,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
  }, [mode, pillLeft, pillW]);

  const handlePress = (value: ThemeMode, index: number) => {
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 0.88, useNativeDriver: true, friction: 8, tension: 120 }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
    ]).start();
    setMode(value);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.row, { backgroundColor: colors.inputBg }]} onLayout={onLayout}>
        {/* Sliding pill indicator */}
        {pillW > 0 && (
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                width: pillW,
                transform: [{ translateX: pillLeft }],
              },
            ]}
          />
        )}
        {options.map((opt, index) => {
          const active = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => handlePress(opt.value, index)}
              style={[styles.btn, { transform: [{ scale: scales[index] }] }]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={active ? colors.primary : colors.textTertiary}
              />
              <Text style={[styles.label, { color: active ? colors.primary : colors.textTertiary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
