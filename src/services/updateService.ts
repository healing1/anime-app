import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

// ═══════════════════════════════════════════════
// 配置：发布 APK 后修改以下地址
// ═══════════════════════════════════════════════
const GITHUB_OWNER = 'healing1';
const GITHUB_REPO  = 'anime-app';
const RELEASE_API  = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// GitHub 镜像列表（国内 GFW 阻断 GitHub 时自动回退）
// 空字符串 = 直连；其他为镜像前缀
const GITHUB_MIRRORS = [
  '',
  'https://ghproxy.com/',
  'https://ghfast.top/',
];

const LAST_CHECK_KEY = '@last_update_check';

// 当前 App 版本（与 build.gradle 保持同步）
const CURRENT_VERSION_CODE = 5;
const CURRENT_VERSION_NAME = '1.0.4';

interface ReleaseInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  fileName: string;
  body: string;
}

/**
 * 带镜像回退的 fetch。
 * 直连优先 → 镜像1 → 镜像2 → 全部失败则抛异常
 */
async function fetchWithMirror(url: string, timeoutMs = 8000): Promise<{ response: Response; effectiveUrl: string }> {
  let lastError: any;

  for (const mirror of GITHUB_MIRRORS) {
    const fullUrl = mirror ? `${mirror}${url}` : url;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(fullUrl, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[Update] ✓ connected via ${mirror || 'direct'}`);
        return { response, effectiveUrl: fullUrl };
      }
      // 404 也正常返回（release 不存在）
      if (response.status === 404) {
        return { response, effectiveUrl: fullUrl };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      console.log(`[Update] ✗ ${mirror || 'direct'} failed:`, err.message?.slice(0, 60));
    }
  }

  throw lastError || new Error('All mirrors unreachable');
}

/** 给下载 URL 加镜像前缀（自动检测哪个镜像可用） */
function mirrorDownloadUrl(downloadUrl: string, effectiveApiUrl: string): string {
  for (const mirror of GITHUB_MIRRORS) {
    if (mirror && effectiveApiUrl.startsWith(mirror)) {
      return `${mirror}${downloadUrl}`;
    }
  }
  return downloadUrl;
}

/**
 * 解析 GitHub Release 的 tag_name，提取 versionCode。
 * tag_name 格式：v{versionCode}-{versionName}  例如 v3-1.0.2
 * 或者直接用 versionCode 数字。
 */
function parseVersionCode(tagName: string): number {
  // 去掉前导 v
  const t = tagName.replace(/^v/i, '');
  // 尝试 "3-1.0.2" 格式
  const dashIdx = t.indexOf('-');
  if (dashIdx > 0) {
    const code = parseInt(t.slice(0, dashIdx), 10);
    if (!isNaN(code)) return code;
  }
  // 尝试纯数字
  const num = parseInt(t, 10);
  if (!isNaN(num)) return num;
  return 0;
}

function parseVersionName(tagName: string): string {
  const t = tagName.replace(/^v/i, '');
  const dashIdx = t.indexOf('-');
  if (dashIdx > 0) return t.slice(dashIdx + 1);
  return t;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  forceUpdate: boolean;       // >= 2 个版本差距，强制更新
  releaseInfo: ReleaseInfo | null;
}

/**
 * 检查 GitHub Releases 是否有新版本。
 * 一天只自动检查一次（手动调用不受限制）。
 */
export async function checkForUpdates(forceCheck = false): Promise<UpdateCheckResult> {
  const noUpdate: UpdateCheckResult = { hasUpdate: false, forceUpdate: false, releaseInfo: null };

  // 一天只检查一次（手动强制检查除外）
  if (!forceCheck) {
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return noUpdate;
      }
    }
  }

  await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

  try {
    const { response, effectiveUrl } = await fetchWithMirror(RELEASE_API);

    if (!response.ok) {
      if (response.status === 404) return noUpdate;
      console.log('[Update] GitHub API error:', response.status);
      return noUpdate;
    }

    const release = await response.json();

    // 解析版本
    const remoteCode = parseVersionCode(release.tag_name);
    const remoteName = parseVersionName(release.tag_name);

    if (remoteCode <= CURRENT_VERSION_CODE) return noUpdate;

    // 找 APK asset（发布时挂的附件）
    const apkAsset = release.assets?.find(
      (a: any) => a.name?.endsWith('.apk') && a.browser_download_url,
    );

    let downloadUrl: string;
    let fileName: string;

    if (apkAsset) {
      downloadUrl = mirrorDownloadUrl(apkAsset.browser_download_url, effectiveUrl);
      fileName = apkAsset.name;
    } else {
      // Release 没有附件时，回退到 repo 里的 APK 文件
      // （uploads.github.com 被 GFW 阻断时，APK 直接推送到仓库根目录）
      fileName = `animer-v${remoteName}-arm64.apk`;
      downloadUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master/${fileName}`;
      console.log('[Update] No release asset, using repo file:', fileName);
    }

    const diff = remoteCode - CURRENT_VERSION_CODE;
    const releaseInfo: ReleaseInfo = {
      versionCode: remoteCode,
      versionName: remoteName,
      downloadUrl,
      fileName,
      body: release.body || '',
    };

    return {
      hasUpdate: true,
      forceUpdate: diff >= 2,
      releaseInfo,
    };
  } catch (err: any) {
    console.log('[Update] All mirrors unreachable:', err.message?.slice(0, 80));
    return noUpdate;
  }
}

/**
 * 弹窗提示更新。
 * forceUpdate = true 时只有"立即更新"按钮，不可取消。
 */
export function showUpdateDialog(
  info: ReleaseInfo,
  forceUpdate: boolean,
  onStartDownload: () => void,
) {
  const message = forceUpdate
    ? `检测到重大更新 v${info.versionName}，当前版本已不兼容，请立即更新。\n\n${info.body ? `更新内容：\n${info.body}` : ''}`
    : `发现新版本 v${info.versionName}，是否下载更新？\n\n${info.body ? `更新内容：\n${info.body}` : ''}`;

  const buttons: any[] = forceUpdate
    ? [{ text: '立即更新', onPress: onStartDownload }]
    : [
        { text: '稍后再说', style: 'cancel' },
        { text: '立即更新', onPress: onStartDownload },
      ];

  Alert.alert('发现新版本', message, buttons, { cancelable: !forceUpdate });
}

/**
 * 下载 APK 并调用系统安装器。
 * 返回一个函数用于取消下载（暂未实现取消）。
 */
export async function downloadAndInstall(
  info: ReleaseInfo,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const destPath = `${FileSystem.documentDirectory}${info.fileName}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    info.downloadUrl,
    destPath,
    {},
    (progress) => {
      const pct = progress.totalBytesExpectedToWrite
        ? Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100)
        : 0;
      onProgress?.(pct);
    },
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      Alert.alert('下载失败', 'APK 文件下载失败，请稍后重试。');
      return;
    }

    // Android: 调用 FileProvider 打开安装
    if (Platform.OS === 'android') {
      await openApkFile(result.uri);
    } else {
      Alert.alert('提示', '下载完成，请在文件管理器中手动安装。');
    }
  } catch (err: any) {
    console.log('[Update] Download failed:', err.message);
    Alert.alert('下载失败', err.message?.slice(0, 100) || '未知错误');
  }
}

/**
 * Android: 用 Intent 打开 APK 文件，触发系统安装器
 * 依赖之前已配置的 FileProvider（在 AndroidManifest.xml 中）
 */
async function openApkFile(fileUri: string): Promise<void> {
  try {
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: 'application/vnd.android.package-archive',
    });
  } catch {
    // 回退：尝试直接打开 URI
    try {
      await Linking.openURL(fileUri);
    } catch {
      Alert.alert('提示', '下载完成！请在文件管理器中找到 APK 并手动安装。');
    }
  }
}
