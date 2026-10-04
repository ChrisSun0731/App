import type { ComponentType } from 'react';

import type { FeatureId } from './registry';
import FoodScreen from './food/screen';
import HelpScreen from './help/screen';
import MenuScreen from './menu/screen';
import NewsScreen from './news/screen';
import PromoScreen from './promo/screen';
import ScheduleScreen from './schedule/screen';
import SouvenirScreen from './souvenir/screen';
import TodoScreen from './todo/screen';
import TransportScreen from './transport/screen';

export const FEATURE_SCREENS: Record<FeatureId, ComponentType> = {
  promo: PromoScreen, souvenir: SouvenirScreen, todo: TodoScreen, transport: TransportScreen,
  menu: MenuScreen, food: FoodScreen, news: NewsScreen, schedule: ScheduleScreen, help: HelpScreen,
};
