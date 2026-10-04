import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ActionButton, Body } from '@/components/ui/page';
import { openWebsite } from '@/lib/open-link';
import { usePalette } from '@/theme/palette';

const URL = 'https://souvenir.cksc.tw/auth';

export default function SouvenirScreen() {
  const palette = usePalette();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    {failed ? <View style={styles.fallback}>
      <Body>目前無法載入紀念品商店。</Body>
      <ActionButton label="重試" onPress={() => { setFailed(false); setAttempt(attempt + 1); }} />
      <ActionButton label="在瀏覽器開啟" onPress={() => { void openWebsite(URL); }} />
    </View> : <WebView key={attempt} source={{ uri: URL }} style={{ flex: 1 }}
      startInLoadingState renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} />}
      onError={() => setFailed(true)} onHttpError={(event) => { if (event.nativeEvent.statusCode >= 400) setFailed(true); }}
      onShouldStartLoadWithRequest={(request) => /^https?:\/\//i.test(request.url) || request.url === 'about:blank'} />}
  </View>;
}

const styles = StyleSheet.create({ fallback: { padding: 24, gap: 16 } });
