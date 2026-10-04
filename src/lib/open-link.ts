import { Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export async function openWebsite(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert('無法開啟連結', '請稍後再試。');
  }
}

export async function openEmail(address: string) {
  try { await Linking.openURL(`mailto:${address}`); }
  catch { Alert.alert('電子郵件', address); }
}
