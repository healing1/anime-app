import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function CacheManager() {
  const { colors } = useTheme();
  const [cacheSize, setCacheSize] = useState<string>('计算中...');
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const estimateSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const savedKeys = ['@following', '@watch_history', '@theme_mode', '@playback', '@api_base_url', '@api_config', '@intro_skips', '@avatar_uri', '@nickname', '@search_history', '@source_profiles', '@active_source_id'];
      const cacheKeys = keys.filter(k => !savedKeys.includes(k));
      const estimatedKB = cacheKeys.length * 2;
      if (estimatedKB < 1024) {
        setCacheSize(`${estimatedKB} KB`);
      } else {
        setCacheSize(`${(estimatedKB / 1024).toFixed(1)} MB`);
      }
    } catch { setCacheSize('0 KB'); }
  };

  useEffect(() => { estimateSize(); }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const savedKeys = ['@following', '@watch_history', '@theme_mode', '@playback', '@api_base_url', '@api_config', '@intro_skips', '@avatar_uri', '@nickname', '@search_history', '@source_profiles', '@active_source_id'];
      const toRemove = keys.filter(k => !savedKeys.includes(k));
      await Promise.all(toRemove.map(k => AsyncStorage.removeItem(k)));
      setCacheSize('0 KB');
    } catch { /* ignore */ }
    setClearing(false);
    setConfirming(false);
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="trash-outline" size={20} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.text }]}>清除缓存</Text>
          <Text style={[styles.size, { color: colors.textTertiary }]}>约 {cacheSize}</Text>
        </View>
      </View>
      {confirming ? (
        <View style={styles.confirmRow}>
          {clearing ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <TouchableOpacity onPress={() => setConfirming(false)} style={[styles.confirmBtn, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.confirmBtnText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClear} style={[styles.confirmBtn, { backgroundColor: colors.danger + '20' }]}>
                <Text style={[styles.confirmBtnText, { color: colors.danger }]}>确定</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.7} onPress={() => setConfirming(true)}
          style={[styles.clearBtn, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.clearText, { color: colors.danger }]}>清除</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
  size: { fontSize: 12, marginTop: 1 },
  clearBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  clearText: { fontSize: 13, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  confirmBtnText: { fontSize: 13, fontWeight: '700' },
});
