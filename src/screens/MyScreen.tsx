import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image, Alert, TextInput, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import ThemeToggle from '../components/ThemeToggle';
import CacheManager from '../components/CacheManager';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { checkForUpdates, showUpdateDialog, downloadAndInstall, CURRENT_VERSION_NAME, type UpdateCheckResult } from '../services/updateService';

export default function MyScreen() {
  const { colors } = useTheme();
  const { following, watchHistory, avatarUri, nickname, setAvatar, setNickname } = useUser();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const [editNameModal, setEditNameModal] = useState(false);
  const [editNameText, setEditNameText] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start();
  }, []);

  const [avatarError, setAvatarError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // 每天一次自动检查更新
  useEffect(() => {
    (async () => {
      const result = await checkForUpdates();
      if (result.hasUpdate && result.releaseInfo) {
        showUpdateDialog(result.releaseInfo, result.forceUpdate, () => {
          handleStartDownload(result);
        });
      }
    })();
  }, []);

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const result = await checkForUpdates(true);
      if (result.hasUpdate && result.releaseInfo) {
        showUpdateDialog(result.releaseInfo, result.forceUpdate, () => {
          handleStartDownload(result);
        });
      } else {
        Alert.alert('已是最新版本', `当前版本 v${CURRENT_VERSION_NAME} 已经是最新。`);
      }
    } catch {
      Alert.alert('检查失败', '无法连接更新服务器，请稍后重试。');
    }
    setChecking(false);
  };

  const handleStartDownload = async (result: UpdateCheckResult) => {
    if (!result.releaseInfo) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadAndInstall(result.releaseInfo, setDownloadProgress);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('提示', '需要相册权限才能更换头像');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarError(false);
      const asset = result.assets[0];
      // Prefer base64 data URI (works everywhere, persists in AsyncStorage)
      if (asset.base64) {
        setAvatar(`data:image/jpeg;base64,${asset.base64}`);
        return;
      }
      // Fallback: try FileSystem copy (native), use original URI on failure (web)
      try {
        const dest = FileSystem.documentDirectory + 'avatar.jpg';
        await FileSystem.copyAsync({ from: asset.uri, to: dest });
        setAvatar(dest);
      } catch {
        setAvatar(asset.uri);
      }
    }
  };

  const handleEditNickname = () => {
    setEditNameText(nickname || '');
    setEditNameModal(true);
  };

  const handleSaveNickname = () => {
    const trimmed = editNameText.trim();
    if (trimmed) setNickname(trimmed);
    setEditNameModal(false);
  };

  const menuItems = [
    {
      icon: 'settings-outline' as const,
      label: '设置',
      desc: '播放设置、外部源配置',
      color: '#6366F1',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'cloud-outline' as const,
      label: '源管理',
      desc: '管理内置源、导入自定义源',
      color: '#F59E0B',
      onPress: () => navigation.navigate('SourceManage'),
    },
    {
      icon: 'cloud-download-outline' as const,
      label: '检查更新',
      desc: downloading ? `正在下载... ${downloadProgress}%` : checking ? '正在检查...' : `v${CURRENT_VERSION_NAME} · 点击检查新版本`,
      color: '#8B5CF6',
      onPress: () => { if (!checking && !downloading) handleCheckUpdate(); },
      disabled: checking || downloading,
    },
    {
      icon: 'information-circle-outline' as const,
      label: '关于',
      desc: `animer v${CURRENT_VERSION_NAME} · 多源动漫播放器`,
      color: '#10B981',
      onPress: () => navigation.navigate('About'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>我的</Text>
        <TouchableOpacity onPress={handleEditNickname} style={[styles.editBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* User card */}
          <Animated.View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }, { transform: [{ scale: cardScale }] }]}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
              {avatarUri && !avatarError ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImg}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={32} color={colors.primary} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={10} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.nickname, { color: colors.text }]}>{nickname || '动漫爱好者'}</Text>
            <Text style={[styles.userId, { color: colors.textTertiary }]}>点击头像更换 · 点击编辑按钮修改昵称</Text>
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Following')}>
                <Text style={[styles.statNum, { color: colors.text }]}>{following.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>在追</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('WatchHistory')}>
                <Text style={[styles.statNum, { color: colors.text }]}>{watchHistory.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>观看记录</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Theme section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>主题风格</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemeToggle />
          </View>

          {/* Cache */}
          <View style={{ marginTop: 12 }}>
            <CacheManager />
          </View>

          {/* Menu items */}
          <View style={styles.menuSection}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={(item as any).disabled ? 1 : 0.7}
                disabled={(item as any).disabled}
                onPress={item.onPress}
                style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    {(item as any).disabled ? (
                      <ActivityIndicator size="small" color={item.color} />
                    ) : (
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.menuDesc, { color: colors.textTertiary }]}>{item.desc}</Text>
                    {(item as any).disabled && downloading && (
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${downloadProgress}%`, backgroundColor: item.color }]} />
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name={(item as any).disabled ? 'hourglass-outline' : 'chevron-forward'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Nickname edit modal */}
      <Modal visible={editNameModal} transparent animationType="fade" onRequestClose={() => setEditNameModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditNameModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>修改昵称</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={editNameText}
              onChangeText={setEditNameText}
              placeholder="输入新昵称"
              placeholderTextColor={colors.textTertiary}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setEditNameModal(false)} style={[styles.modalBtn, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveNickname} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  editBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  userCard: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', paddingTop: 24, paddingBottom: 4,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarImg: { width: 68, height: 68, borderRadius: 34, marginBottom: 10 },
  avatarBadge: {
    position: 'absolute', bottom: 8, right: -2,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  nickname: { fontSize: 18, fontWeight: '700' },
  userId: { fontSize: 12, marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingVertical: 16, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  sectionCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14 },
  menuSection: { paddingHorizontal: 16, marginTop: 10, gap: 8 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDesc: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: 300, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  progressBar: { height: 4, borderRadius: 2, marginTop: 8, width: '80%', overflow: 'hidden' as const },
  progressFill: { height: '100%', borderRadius: 2 },
});
