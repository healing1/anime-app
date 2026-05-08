import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { getExampleSourceJSON } from '../api/builtinSource';
import type { SourceProfile } from '../api/sourceTypes';

export default function SourceManageScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [repoURL, setRepoURL] = useState('');
  const [sources, setSources] = useState<SourceProfile[]>([]);
  const [activeId, setActiveId] = useState('');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [profiles, activeProfile] = await Promise.all([
      api.getAvailableSources(),
      api.getActiveSourceProfile(),
    ]);
    setSources(profiles);
    setActiveId(activeProfile?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImport = useCallback(async () => {
    const url = repoURL.trim();
    if (!url) { Alert.alert('提示', '请输入源配置JSON地址'); return; }
    if (!url.startsWith('http')) { Alert.alert('提示', '请输入有效的HTTP/HTTPS地址'); return; }

    setImporting(true);
    const result = await api.importSource(url);
    setImporting(false);

    if (!result.success) {
      Alert.alert('导入失败', result.error || '未知错误');
    } else {
      Alert.alert('导入成功', `已添加源「${result.profile?.name || '未知'}」并设为活跃源`);
      load();
    }
  }, [repoURL, load]);

  const handleSetActive = useCallback(async (id: string) => {
    const ok = await api.setActiveSource(id);
    if (ok) {
      setActiveId(id);
      const profile = sources.find(s => s.id === id);
      Alert.alert('已切换', `当前活跃源：${profile?.name || id}`);
    }
  }, [sources]);

  const handleRemove = useCallback(async (id: string, name: string) => {
    if (id === 'tvbox-liangzi') {
      Alert.alert('提示', '不能删除默认源');
      return;
    }
    Alert.alert('删除源', `确定删除「${name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await api.removeSource(id);
          load();
        },
      },
    ]);
  }, [load]);

  const handleFillExample = useCallback(() => {
    setRepoURL('https://example.com/source.json');
    Alert.alert(
      '源配置格式',
      '自定义REST API源格式如下，将此JSON部署到你的服务器后填入上方地址：\n\n' + getExampleSourceJSON(),
      [{ text: '好的' }]
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>源管理</Text>
        <TouchableOpacity onPress={handleFillExample} style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Import section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>导入源</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            输入源配置JSON地址，支持以下格式：{'\n'}
            1. 源配置JSON（含 name、type、baseUrl、endpoints）{'\n'}
            2. 多仓格式（{"{"}urls:[...]{"}"}，取第一个站点作为源）
          </Text>
          <TextInput
            value={repoURL}
            onChangeText={setRepoURL}
            placeholder="https://example.com/source.json"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            autoCapitalize="none" autoCorrect={false} keyboardType="url"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleImport}
            disabled={importing}
            style={[styles.importBtn, { backgroundColor: colors.primary, opacity: importing ? 0.6 : 1 }]}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
            )}
            <Text style={styles.importBtnText}>{importing ? '导入中...' : '导入源'}</Text>
          </TouchableOpacity>
        </View>

        {/* Source list */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
          已注册源 ({sources.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : sources.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>暂无源，请导入源配置</Text>
          </View>
        ) : (
          <View style={{ gap: 8, paddingHorizontal: 16 }}>
            {sources.map((source, i) => {
              const isActive = source.id === activeId;
              return (
                <View key={source.id || i} style={[styles.siteItem, {
                  backgroundColor: isActive ? colors.primaryLight : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: isActive ? 1.5 : 1,
                }]}>
                  <View style={styles.siteLeft}>
                    <View style={[styles.siteIcon, { backgroundColor: isActive ? colors.primary + '30' : colors.success + '20' }]}>
                      <Ionicons
                        name={isActive ? 'radio-button-on' : 'server-outline'}
                        size={20}
                        color={isActive ? colors.primary : colors.success}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.siteName, { color: colors.text }]} numberOfLines={1}>
                          {source.name}
                        </Text>
                        {isActive && (
                          <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.activeBadgeText}>当前</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.siteURL, { color: colors.textTertiary }]} numberOfLines={1}>
                        {source.type === 'tvbox' ? `TVBox · ${source.baseUrl || '无地址'}` : source.type === 'rest' ? `REST · ${source.baseUrl || '无地址'}` : `${source.type} · ${source.baseUrl || '无地址'}`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!isActive && (
                      <TouchableOpacity onPress={() => handleSetActive(source.id)}
                        style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    {source.id !== 'tvbox-liangzi' && (
                      <TouchableOpacity onPress={() => handleRemove(source.id, source.name)}
                        style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
  helpBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10, marginTop: 20 },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
  importBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10,
  },
  importBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
  siteItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12,
  },
  siteLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  siteIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  siteName: { fontSize: 14, fontWeight: '600' },
  siteURL: { fontSize: 11, marginTop: 2 },
  activeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activeBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
