import { Card, Body } from '@/components/ui/page';

import type { RestaurantMapProps } from './restaurant-map.types';

export default function RestaurantMap(_props: RestaurantMapProps) {
  return <Card><Body secondary>切換到餐廳列表查看營業時間，或在地圖 App 開啟餐廳位置。</Body></Card>;
}
