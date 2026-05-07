import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { UserProvider } from './src/contexts/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { checkForUpdates, showUpdateDialog, downloadAndInstall } from './src/services/updateService';

export const navigationRef = createNavigationContainerRef();

function AppContent() {
  const { isDark } = useTheme();

  // 每天一次自动检查更新
  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await checkForUpdates();
      if (result.hasUpdate && result.releaseInfo) {
        showUpdateDialog(result.releaseInfo, result.forceUpdate, async () => {
          // 强制更新不可取消，选"立即更新"后下载
          try { await downloadAndInstall(result.releaseInfo!); } catch { /* */ }
        });
      }
    }, 2000); // 延迟2秒，等首页加载完
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => handler.remove();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <NavigationContainer ref={navigationRef}>
            <AppContent />
          </NavigationContainer>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
