import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { Source } from '../types';

interface Props {
  visible: boolean;
  sources: Source[];
  currentSource?: string;
  loading?: boolean;
  onSelect: (source: Source) => void;
  onClose: () => void;
}

export default function SourceSelector({ visible, sources, currentSource, loading, onSelect, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.title, { color: colors.text }]}>选择播放源</Text>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            {loading ? '正在解析视频地址...' : `当前共 ${sources.length} 个可用源`}
          </Text>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : sources.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, marginTop: 8, fontSize: 14 }}>暂无可用播放源</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {sources.map((s, i) => {
                const active = s.url === currentSource;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => { onSelect(s); onClose(); }}
                    style={[
                      styles.option,
                      { backgroundColor: active ? colors.primaryLight : colors.inputBg,
                        borderColor: active ? colors.primary : 'transparent',
                        borderWidth: active ? 1.5 : 0,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.qualityBadge, { backgroundColor: active ? colors.primary : colors.textTertiary }]}>
                        <Text style={styles.qualityText}>{s.label.split(' ')[0]}</Text>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.optionTitle, { color: active ? colors.primary : colors.text }]}>
                          {s.label}
                        </Text>
                        <Text style={[styles.optionServer, { color: colors.textTertiary }]}>
                          {s.server}
                        </Text>
                      </View>
                    </View>
                    {active ? (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      </View>
                    ) : (
                      <Ionicons name="play-circle-outline" size={22} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 12, textAlign: 'center', marginBottom: 6 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  qualityBadge: {
    width: 40, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center',
  },
  qualityText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionServer: { fontSize: 11, marginTop: 2 },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
});
