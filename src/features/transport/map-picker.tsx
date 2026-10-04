import { useState } from 'react';

import { ActionButton, Body, Field } from '@/components/ui/page';

import type { StationMapProps } from './map-picker.types';

/** Native builds resolve map-picker.native.tsx; the browser accepts a coordinate. */
export default function StationMap({ point, onSelect }: StationMapProps) {
  const [latitude, setLatitude] = useState(String(point.latitude));
  const [longitude, setLongitude] = useState(String(point.longitude));
  const lat = Number(latitude);
  const lon = Number(longitude);
  const valid = latitude.trim() !== '' && longitude.trim() !== '' && Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;
  return (
    <>
      <Body secondary>輸入座標查看附近站點。預設位置為建中。</Body>
      <Field label="緯度" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
      <Field label="經度" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
      <ActionButton label="搜尋此位置" disabled={!valid} onPress={() => onSelect({ latitude: lat, longitude: lon })} />
    </>
  );
}
