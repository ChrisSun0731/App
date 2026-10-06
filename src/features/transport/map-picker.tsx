import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePalette } from '@/theme/palette';

import type { StationMapProps } from './map-picker.types';

// Native builds resolve map-picker.native.tsx. The browser has no map view,
// so this stand-in, shown inside the kit's Embedded like the map, takes a
// coordinate instead.

export const stationMapAvailable = true;

export const STATION_MAP_HINT = '輸入座標查看附近站點。預設位置為建中，搜尋涵蓋臺北市與新北市。';

export default function StationMap({ point, onSelect }: StationMapProps) {
  const palette = usePalette();
  const [latitude, setLatitude] = useState(String(point.latitude));
  const [longitude, setLongitude] = useState(String(point.longitude));
  const lat = Number(latitude);
  const lon = Number(longitude);
  const valid = latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;
  const input = [styles.input, { color: palette.text, borderColor: palette.separator }];
  return (
    <View style={styles.form}>
      {([['緯度', latitude, setLatitude], ['經度', longitude, setLongitude]] as const).map(([label, value, onChange]) => (
        <View key={label} style={styles.field}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            style={input}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid }}
        disabled={!valid}
        onPress={() => onSelect({ latitude: lat, longitude: lon })}
        style={[styles.button, { backgroundColor: palette.tint }, valid ? null : styles.disabled]}>
        <Text style={[styles.buttonText, { color: palette.onTint }]}>搜尋此位置</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  field: { gap: 4 },
  label: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
