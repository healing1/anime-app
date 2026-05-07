import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { Episode } from '../types';

interface Props {
  episodes: Episode[];
  currentEpisodeId?: string;
  onSelect: (ep: Episode) => void;
}

export default memo(function EpisodeGrid({ episodes, currentEpisodeId, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {episodes.map(ep => {
        const isActive = ep.id === currentEpisodeId;
        return (
          <TouchableOpacity
            key={ep.id} activeOpacity={0.7}
            onPress={() => onSelect(ep)}
            style={[
              styles.item,
              {
                backgroundColor: isActive ? colors.primary : colors.inputBg,
                borderColor: isActive ? colors.primary : colors.border,
                borderWidth: isActive ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.num, { color: isActive ? '#FFF' : colors.text }]}>
              {ep.num}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  item: {
    width: 46, height: 36,
    borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  num: { fontSize: 13, fontWeight: '600' },
});
