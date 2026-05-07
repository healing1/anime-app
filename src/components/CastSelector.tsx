import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { CastDevice } from '../types';

const deviceIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  chromecast: 'tv',
  airplay: 'logo-apple',
  dlna: 'laptop',
  smarttv: 'tv-outline',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SCAN_PORTS = [
  { port: 8008, type: 'chromecast' as const, namePrefix: 'Chromecast' },
  { port: 8009, type: 'chromecast' as const, namePrefix: 'Chromecast' },
  { port: 9080, type: 'dlna' as const, namePrefix: 'DLNA设备' },
  { port: 5000, type: 'dlna' as const, namePrefix: 'DLNA设备' },
  { port: 7000, type: 'airplay' as const, namePrefix: 'AirPlay设备' },
];

export default function CastSelector({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<CastDevice[]>([]);
  const [connected, setConnected] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState('正在获取网络信息...');

  useEffect(() => {
    if (visible) {
      setScanning(true);
      setConnected(null);
      setDevices([]);
      scanNetwork();
    }
  }, [visible]);

  const scanNetwork = async () => {
    try {
      setScanStatus('正在扫描局域网设备...');
      const discovered: CastDevice[] = [];

      const subnets = ['192.168.1', '192.168.0', '192.168.31', '192.168.50', '10.0.0'];
      const scanPromises: Promise<void>[] = [];

      for (const subnet of subnets) {
        for (let host = 1; host <= 15; host++) {
          const baseIP = `${subnet}.${host}`;
          for (const { port, type, namePrefix } of SCAN_PORTS) {
            scanPromises.push(
              (async () => {
                try {
                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 1000);
                  const resp = await fetch(`http://${baseIP}:${port}/`, { signal: controller.signal });
                  clearTimeout(timeout);
                  if (resp.ok || resp.status < 500) {
                    discovered.push({
                      id: `lan-${baseIP}-${port}`,
                      name: `${namePrefix} (${baseIP})`,
                      type,
                    });
                    setDevices([...discovered]);
                    setScanStatus(`已发现 ${discovered.length} 个设备...`);
                  }
                } catch { /* skip */ }
              })()
            );
          }
        }
      }

      const maxWait = new Promise<void>(r => setTimeout(r, 6000));
      await Promise.race([Promise.allSettled(scanPromises), maxWait]);
      setScanStatus(discovered.length > 0 ? '' : '未发现设备，请确保设备在同一WiFi下');
    } catch {
      setScanStatus('扫描失败，请检查网络连接');
    }
    setScanning(false);
  };

  const handleConnect = (device: CastDevice) => {
    setConnected(device.id);
    setTimeout(() => { setConnected(null); onClose(); }, 800);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.title, { color: colors.text }]}>投屏到设备</Text>

          {scanning ? (
            <View style={styles.scanning}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.scanText, { color: colors.textSecondary }]}>{scanStatus}</Text>
              {devices.length > 0 && (
                <Text style={[styles.foundCount, { color: colors.primary }]}>
                  已找到 {devices.length} 个设备
                </Text>
              )}
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.scanning}>
              <Ionicons name="wifi-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.scanText, { color: colors.textTertiary, marginTop: 12 }]}>未发现可用设备</Text>
              <Text style={[styles.hintText, { color: colors.textTertiary }]}>
                请确保手机和投屏设备连接同一WiFi网络
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {devices.map(device => {
                const isConnecting = connected === device.id;
                return (
                  <TouchableOpacity
                    key={device.id} activeOpacity={0.7} onPress={() => handleConnect(device)}
                    style={[styles.deviceItem, { backgroundColor: isConnecting ? colors.primaryLight : colors.inputBg }]}
                  >
                    <View style={[styles.deviceIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name={deviceIcons[device.type] || 'tv'} size={22} color={isConnecting ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, { color: isConnecting ? colors.primary : colors.text }]}>{device.name}</Text>
                      <Text style={[styles.deviceType, { color: colors.textTertiary }]}>
                        局域网设备 · {device.type === 'chromecast' ? '投屏设备' : device.type === 'airplay' ? '隔空播放' : 'DLNA设备'}
                      </Text>
                    </View>
                    {isConnecting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="link-outline" size={20} color={colors.textTertiary} />}
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
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, minHeight: 320 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  scanning: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  scanText: { fontSize: 14, marginTop: 12 },
  foundCount: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  hintText: { fontSize: 12, marginTop: 8, opacity: 0.7 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  deviceIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 15, fontWeight: '600' },
  deviceType: { fontSize: 12, marginTop: 2 },
});
