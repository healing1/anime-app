import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const scales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const fadeAnims = useRef(state.routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(60, fadeAnims.map(anim =>
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 })
    )).start();
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  const handlePress = (route: typeof state.routes[number], index: number, isFocused: boolean) => {
    if (!isFocused) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 0.88, useNativeDriver: true, friction: 8, tension: 120 }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
    ]).start();
  };

  // Frosted glass: semi-transparent, adapts to theme
  const capsuleBg = isDark ? 'rgba(22,22,29,0.94)' : 'rgba(255,255,255,0.94)';

  return (
    <View style={[styles.shell, { paddingBottom: insets.bottom + 8 }]}>
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: capsuleBg,
            shadowColor: isDark ? '#000' : '#888',
          },
        ]}
        onLayout={onLayout}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const color = isFocused ? colors.primary : colors.textTertiary;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => handlePress(route, index, isFocused)}
              style={[styles.btn, { transform: [{ scale: scales[index] }] }]}
            >
              <Animated.View style={[styles.iconWrap, { opacity: fadeAnims[index] }]}>
                {options.tabBarIcon?.({ color, size: 22, focused: isFocused })}
                {isFocused && (
                  <Animated.View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                )}
              </Animated.View>
              <Animated.Text
                style={[
                  styles.label,
                  {
                    color,
                    opacity: fadeAnims[index],
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {typeof label === 'string' ? label : ''}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 6,
    // Shadow — floating depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
