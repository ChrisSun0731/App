import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { MAP_AVAILABLE } from '@/lib/map-availability';

import type { StationMapProps } from './map-picker.types';
import { stationDisplayName } from './youbike';

/** Without a Google Maps key (Android), the picker shows a notice instead of mounting the map. */
export const stationMapAvailable = MAP_AVAILABLE;

/** The map section's footer. */
export const STATION_MAP_HINT = '點選地圖選擇搜尋位置。初始位置為建中，搜尋涵蓋臺北市與新北市。';

/** The nearby-stations map. It fills its parent: the kit's Embedded gives it its size. */
export default function StationMap({ point, stations, onSelect }: StationMapProps) {
  const radius = stations.length ? stations[stations.length - 1].distanceKm * 1000 : 0;
  return (
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
  );
}
