import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { STATUS_COLORS } from './food-view';
import { MAP_AVAILABLE } from './map-availability';
import { getOpenStatus, STATUS_LABELS } from './opening-hours';
import type { RestaurantMapProps } from './restaurant-map.types';

/**
 * Restaurants near 建中 as pins in their status colour. It fills the kit's
 * Embedded row, which gives it its size and rounded corners.
 */
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

  // 美食 only offers the map when it is available; this guards against
  // mounting Google Maps on Android without a built-in API key, which crashes.
  if (!MAP_AVAILABLE) return null;

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
            pinColor={STATUS_COLORS[status]}
            onPress={() => onSelect(restaurant)}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { flex: 1 } });
