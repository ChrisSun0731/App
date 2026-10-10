import type { RestaurantMapProps } from './restaurant-map.types';

// react-native-maps has no web implementation, and 美食 never offers the map
// on web (MAP_AVAILABLE is false there), so this only keeps the bundle valid.
export default function RestaurantMap(_props: RestaurantMapProps) {
  return null;
}
