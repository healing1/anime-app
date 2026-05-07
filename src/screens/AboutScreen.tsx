import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { CURRENT_VERSION_NAME } from '../services/updateService';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, []);

  const handleEmail = () => {
    Linking.openURL('mailto:3221473552@qq.com');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>关于</Text>
        <View style={styles.backBtn} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Logo area */}
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="play-circle" size={48} color="#FFF" />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>animer</Text>
            <Text style={[styles.version, { color: colors.textTertiary }]}>v{CURRENT_VERSION_NAME}</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>多源动漫播放器 · 追番必备</Text>
          </View>

          {/* Author info */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>开发者</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>作者</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>黄花鱼</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail} activeOpacity={0.7}>
              <Ionicons name="mail-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>邮箱</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>3221473552@qq.com</Text>
              <Ionicons name="open-outline" size={14} color={colors.textTertiary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Tech stack */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>技术栈</Text>
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>框架</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>React Native + Expo SDK 54</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="cloud-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>数据源</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Jikan · Kitsu · TVBox/苹果CMS</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="videocam-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>播放器</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>expo-video (HLS/m3u8/MP4)</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.disclaimerHeader}>
              <Ionicons name="warning-outline" size={16} color={colors.warning || '#F59E0B'} />
              <Text style={[styles.disclaimerTitle, { color: colors.warning || '#F59E0B' }]}>免责声明</Text>
            </View>
            <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
              本软件仅提供视频播放服务，所有视频内容、动漫资源均来自第三方公开接口及用户自行配置的数据源。本软件不存储、不上传、不生产任何视频内容，仅作为网络链接的聚合工具。{'\n\n'}
              所有资源版权归原作者及视频网站所有，本软件仅供学习交流使用，请勿用于商业用途。如有侵权，请联系我们删除。使用本软件即表示您已了解并同意上述条款。
            </Text>
          </View>

          <Text style={[styles.copyright, { color: colors.textTertiary }]}>
            © 2026 animer. All rights reserved.
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingVertical: 36 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  appName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  version: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  tagline: { fontSize: 13, marginTop: 6 },
  infoCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 18, marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 14, marginLeft: 12, width: 52 },
  infoValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 34 },
  copyright: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  disclaimerCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 18, marginBottom: 14, marginTop: 8,
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  disclaimerTitle: { fontSize: 14, fontWeight: '700' },
  disclaimerText: { fontSize: 12, lineHeight: 20 },
});
