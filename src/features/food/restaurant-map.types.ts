import type { Restaurant } from './opening-hours';

export interface RestaurantMapProps {
  restaurants: Restaurant[];
  selected: Restaurant | null;
  now: Date;
  onSelect: (restaurant: Restaurant) => void;
}
