import { useDataFile } from '@/lib/remote-data';

import { isRestaurantList } from './opening-hours';

export function useRestaurants() {
  return useDataFile('restaurantData.json', isRestaurantList);
}
