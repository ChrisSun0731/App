import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Body } from '@/components/ui/page';

import { getOpenStatus, STATUS_LABELS } from './opening-hours';
import type { RestaurantMapProps } from './restaurant-map.types';

export default function RestaurantMap({ restaurants, selected, now, onSelect }: RestaurantMapProps) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    if (!selected) return;
    map.current?.animateToRegion({
      latitude: selected.position[0],
      longitude: selected.position[1],
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    }, 350);
  }, [selected]);

  if (Platform.OS === 'android' && Constants.expoConfig?.extra?.googleMapsConfigured !== true) {
    return <Body secondary>地圖暫時無法使用。請切換列表查看餐廳與營業資訊。</Body>;
  }

  return (
    <MapView
      ref={map}
      style={styles.map}
      accessibilityLabel="建中附近餐廳地圖"
      initialRegion={{
        latitude: 25.031204,
        longitude: 121.515496,
        latitudeDelta: 0.013,
        longitudeDelta: 0.013,
      }}>
      <Marker coordinate={{ latitude: 25.03079, longitude: 121.51227 }} title="建國中學" pinColor="#03328D" />
      {restaurants.map((restaurant) => {
        const status = getOpenStatus(restaurant.openingHours, now);
        return (
          <Marker
            key={restaurant.name}
            coordinate={{ latitude: restaurant.position[0], longitude: restaurant.position[1] }}
            title={restaurant.name}
            description={STATUS_LABELS[status]}
            pinColor={MARKER_COLORS[status]}
            onPress={() => onSelect(restaurant)}
          />
        );
      })}
    </MapView>
  );
}

const MARKER_COLORS = {
  open: '#1B873F',
  closingSoon: '#C77800',
  openingSoon: '#2965B3',
  closed: '#777777',
};

const styles = StyleSheet.create({ map: { height: 360, width: '100%', borderRadius: 16 } });
