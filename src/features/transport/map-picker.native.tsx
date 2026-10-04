import Constants from 'expo-constants';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { Body } from '@/components/ui/page';

import type { StationMapProps } from './map-picker.types';
import { stationDisplayName } from './youbike';

export default function StationMap({ point, stations, onSelect }: StationMapProps) {
  // Expo removes android.config from the public manifest. Keep a boolean in
  // extra so the native map is not mounted without a built-in Maps API key.
  const mapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured === true;
  if (Platform.OS === 'android' && !mapsConfigured) {
    return <Body secondary>地圖暫時無法使用。下方仍可查看建中附近的站點，或切換「搜尋站點」。</Body>;
  }
  const radius = stations.length ? stations[stations.length - 1].distanceKm * 1000 : 0;
  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...point, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
        onPress={(event) => {
          if (event.nativeEvent.action !== 'marker-press') onSelect(event.nativeEvent.coordinate);
        }}
        accessibilityLabel="點選地圖位置，搜尋附近 YouBike 站點"
      >
        <Marker coordinate={point} title="搜尋位置" pinColor="#C62828" />
        {radius > 0 ? <Circle center={point} radius={radius} strokeColor="#C62828" fillColor="rgba(198,40,40,0.07)" /> : null}
        {stations.map((station) => (
          <Marker
            key={`${station.city}:${station.sna}`}
            coordinate={station}
            title={stationDisplayName(station.sna)}
            description={`可借 ${station.rent ?? '未知'} · 可還 ${station.return ?? '未知'}`}
            pinColor="#238545"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ container: { height: 290, borderRadius: 16, overflow: 'hidden' } });
