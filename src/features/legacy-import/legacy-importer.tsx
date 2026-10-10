// Reads the previous app's data out of its WebView storage, then hands it to
// session.ts. The splash screen stays up for the first SPLASH_TIMEOUT_MS; if
// no answer has come by then the app shows and reading goes on unseen until
// READ_TIMEOUT_MS, and a late answer is merged like an early one.
//
// The previous app was a Capacitor 7 WebView app, so everything it saved sits
// in the WebView localStorage of its origin (LEGACY_ORIGINS), out of reach of
// this app's SQLite-backed storage. A hidden page loaded *as* that origin can
// read it, because the app's WebViews share one persistent web storage.
// Checked against react-native-webview 13.16.1's native code:
//
// - iOS (apple/RNCWebViewImpl.m): `source={{ html, baseUrl }}` is
//   -[WKWebView loadHTMLString:baseURL:], so the page gets the base URL's
//   origin. Its data store is WKWebsiteDataStore.defaultDataStore, the
//   persistent one Capacitor used, while `incognito` is false and
//   `cacheEnabled` true; `incognito` (or `cacheEnabled={false}` with
//   `sharedCookiesEnabled`) switches to an empty nonPersistentDataStore.
// - Android (RNCWebViewManagerImpl.kt): `html` + `baseUrl` is
//   WebView.loadDataWithBaseURL, which gives the page that origin and its
//   localStorage. DOM storage and JavaScript are on by default; set anyway.
// - Both: the JS layer checks every navigation, this first load included,
//   against `originWhitelist` (default http(s) only) and hands a refused URL
//   to Linking.openURL. capacitor:// must pass, hence ['*'] for this page,
//   which loads nothing else.
//
// window.ReactNativeWebView exists before page scripts run (an iOS user
// script at document start; on Android a web message listener added before
// the source loads), so the page posts right away; the retry only covers a
// slow bridge.
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { finishLegacyImport } from './session';
import { LEGACY_ORIGINS, parseReaderMessage, pickLegacySource, READ_TIMEOUT_MS, SPLASH_TIMEOUT_MS, type OriginResult } from './status';

const ORIGINS = LEGACY_ORIGINS[Platform.OS] ?? [];

// self.origin is reported so an origin WebKit treats as opaque (which would
// read an empty storage) is recognised instead of passing for a fresh install.
// That is the only failure the page can see: the right origin over another,
// empty storage still reads as a fresh install (hence READER_VERSION).
const READER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
(function () {
  var message;
  try {
    message = JSON.stringify({
      origin: typeof self.origin === 'string' ? self.origin : undefined,
      store: localStorage.getItem('store'),
      userClass: localStorage.getItem('userClass')
    });
  } catch (error) {
    message = JSON.stringify({ error: String(error) });
  }
  var tries = 0;
  (function send() {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
    else if (tries++ < 50) setTimeout(send, 20);
  })();
})();
</script></body></html>`;

/**
 * Mounted while this launch attempts the import (isAttemptingLegacyImport).
 * `onSplashOver` fires when the splash may go although reading goes on;
 * `onSettled` once the attempt has ended, when this can unmount.
 */
export function LegacyImporter({ onSplashOver, onSettled }: { onSplashOver: () => void; onSettled: () => void }) {
  const [results, setResults] = useState<Partial<Record<string, OriginResult>>>({});
  const [expired, setExpired] = useState(false);
  const source = useMemo(() => pickLegacySource(ORIGINS, results), [results]);
  const settled = source.kind !== 'waiting' || expired;

  useEffect(() => {
    const splash = setTimeout(onSplashOver, SPLASH_TIMEOUT_MS);
    const deadline = setTimeout(() => setExpired(true), READ_TIMEOUT_MS);
    return () => { clearTimeout(splash); clearTimeout(deadline); };
  }, [onSplashOver]);
  useEffect(() => {
    if (!settled) return;
    finishLegacyImport(source);
    onSettled();
  }, [settled, source, onSettled]);

  function report(origin: string, result: OriginResult) {
    setResults((previous) => (previous[origin] ? previous : { ...previous, [origin]: result }));
  }

  return <View style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {ORIGINS.map((origin) => <WebView key={origin} style={styles.page}
      source={{ html: READER_HTML, baseUrl: origin }} originWhitelist={['*']}
      javaScriptEnabled domStorageEnabled cacheEnabled incognito={false}
      onMessage={(event) => report(origin, parseReaderMessage(event.nativeEvent.data, origin))}
      onError={() => report(origin, 'failed')}
      onContentProcessDidTerminate={() => report(origin, 'failed')}
      onRenderProcessGone={() => report(origin, 'failed')} />)}
  </View>;
}

const styles = StyleSheet.create({
  // Out of sight and untouchable, also when drawn over the app after the
  // splash (screen readers skip it via the props above).
  hidden: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' },
  page: { width: 1, height: 1, backgroundColor: 'transparent' },
});
