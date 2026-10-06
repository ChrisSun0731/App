// Opening links. One behaviour per kind of link, so the same link acts the
// same everywhere:
// - openWebsite: a page to read (announcements, the shop's and the app's
//   sites, 特約 areas) opens in the in-app browser, and closing it returns
//   to the screen.
// - openExternal: 在瀏覽器開啟 buttons, maps and mail leave the app for the
//   browser or the app that handles the link.
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

const TRY_AGAIN = '請稍後再試一次。';

export async function openWebsite(url: string, failureTitle = '無法開啟連結') {
  if (!/^https?:\/\//i.test(url)) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert(failureTitle, TRY_AGAIN);
  }
}

export async function openExternal(url: string, failureTitle = '無法開啟連結') {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(failureTitle, TRY_AGAIN);
  }
}

export async function openEmail(address: string) {
  try {
    await Linking.openURL(`mailto:${address}`);
  } catch {
    // No mail app: show the address so it can still be copied by hand.
    Alert.alert('電子郵件', address);
  }
}
