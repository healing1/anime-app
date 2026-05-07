import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, StyleSheet, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { playback, updatePlayback, apiBaseURL, setApiBaseURL } = useUser();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [urlInput, setUrlInput] = useState(apiBaseURL);

  const handleTest = () => {
    if (!urlInput.trim()) { Alert.alert('提示', '请输入 API 地址'); return; }
    Alert.alert('提示', '连接测试功能需要接入真实 API 后使用。\n当前使用内置 Mock 数据。');
  };

  const handleSaveURL = () => {
    setApiBaseURL(urlInput.trim());
    Alert.alert('完成', '外部源地址已保存');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>设置</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Playback settings */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>播放设置</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>默认画质</Text>
            <View style={styles.qualityRow}>
              {['360p', '720p', '1080p', '4K'].map(q => {
                const active = q === playback.defaultQuality;
                return (
                  <TouchableOpacity
                    key={q} activeOpacity={0.7}
                    onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updatePlayback({ defaultQuality: q }); }}
                    style={[styles.qualityBtn, { backgroundColor: active ? colors.primary : colors.inputBg }]}
                  >
                    <Text style={[styles.qualityText, { color: active ? '#FFF' : colors.textSecondary }]}>{q}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>自动播放下一集</Text>
              <Text style={[styles.desc, { color: colors.textTertiary }]}>当前集结束后自动切换</Text>
            </View>
            <Switch value={playback.autoPlayNext} onValueChange={v => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updatePlayback({ autoPlayNext: v }); }}
              trackColor={{ false: colors.inputBg, true: colors.primaryLight }}
              thumbColor={playback.autoPlayNext ? colors.primary : colors.textTertiary} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>启用跳过片头</Text>
              <Text style={[styles.desc, { color: colors.textTertiary }]}>在播放页为每部动漫单独设置跳转时间</Text>
            </View>
            <Switch value={playback.skipIntro} onValueChange={v => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updatePlayback({ skipIntro: v }); }}
              trackColor={{ false: colors.inputBg, true: colors.primaryLight }}
              thumbColor={playback.skipIntro ? colors.primary : colors.textTertiary} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>硬件加速</Text>
              <Text style={[styles.desc, { color: colors.textTertiary }]}>使用硬件解码，提升性能</Text>
            </View>
            <Switch value={playback.hardwareAccel} onValueChange={v => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updatePlayback({ hardwareAccel: v }); }}
              trackColor={{ false: colors.inputBg, true: colors.primaryLight }}
              thumbColor={playback.hardwareAccel ? colors.primary : colors.textTertiary} />
          </View>
        </View>

        {/* External source */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>外部源配置</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sourceInfo}>
            <Ionicons name="cloud-outline" size={20} color={colors.primary} />
            <Text style={[styles.desc, { color: colors.textTertiary, flex: 1 }]}>
              接入外部 API 后即可使用真实数据源
            </Text>
          </View>
          <TextInput
            value={urlInput} onChangeText={setUrlInput}
            placeholder="https://api.example.com"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            autoCapitalize="none" autoCorrect={false}
          />
          <View style={styles.urlActions}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleTest}
              style={[styles.actionBtn, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="flash-outline" size={16} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>测试</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSaveURL}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
              <Text style={[styles.actionText, { color: '#FFF' }]}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10, marginTop: 24 },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 3, maxWidth: 240 },
  divider: { height: 1, marginVertical: 2 },
  qualityRow: { flexDirection: 'row', gap: 6 },
  qualityBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  qualityText: { fontSize: 13, fontWeight: '600' },
  sourceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
  urlActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  actionText: { fontSize: 14, fontWeight: '600' },
});
