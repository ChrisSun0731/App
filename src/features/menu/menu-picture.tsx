// Visual content only. Embedded supplies the native tap and accessibility layer.
import { Image, type ImageRef } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/theme/palette';

import { MENU_DIM, MENU_PAPER, menuPictureLayout } from './menu-view';

export function MenuPicture({ image }: { image: ImageRef | null }) {
  const palette = usePalette();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const layout = image ? menuPictureLayout(image, box) : null;
  return (
    <View
      style={styles.paper}
      onLayout={({ nativeEvent: { layout } }) => setBox((previous) => previous.width === layout.width && previous.height === layout.height ? previous : layout)}
      accessible={!image}
      accessibilityLabel={image ? undefined : '正在讀取菜單…'}
      accessibilityState={image ? undefined : { busy: true }}>
      {image ? (
        layout ? (
          <View style={[styles.sheet, layout.sheet]}>
            <Image source={image} style={[styles.picture, layout.picture]} contentFit="fill" transition={150} accessible={false} />
          </View>
        ) : null
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#3C3C43" />
          <Text style={styles.loadingLabel}>正在讀取菜單…</Text>
        </View>
      )}
      {palette.scheme === 'dark' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      {process.env.EXPO_OS === 'android' && palette.scheme === 'light' ? (
        // Matches the Compose kit's CARD_RADIUS.
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderColor: palette.separator }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: MENU_PAPER, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheet: { overflow: 'hidden' },
  picture: { position: 'absolute', left: 0 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  loadingLabel: { fontSize: 15, color: '#3C3C43', flexShrink: 1 },
  dim: { backgroundColor: MENU_DIM },
  outline: { borderWidth: 1, borderRadius: 20 },
});
