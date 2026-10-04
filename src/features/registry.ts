import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/** The app's features, reachable from the home grid and (optionally) the tab bar. */
export const FEATURE_IDS = [
  'promo',
  'souvenir',
  'todo',
  'transport',
  'menu',
  'food',
  'news',
  'schedule',
  'help',
] as const;
export type FeatureId = (typeof FEATURE_IDS)[number];

/** Features that may be pinned to the tab bar; 選擇障礙小幫手 never was. */
export const TAB_FEATURE_IDS = [
  'promo',
  'souvenir',
  'schedule',
  'todo',
  'transport',
  'menu',
  'food',
  'news',
] as const satisfies readonly FeatureId[];
export type TabFeatureId = (typeof TAB_FEATURE_IDS)[number];

/**
 * Most tabs next to 首頁. Material Design 3 and Apple's HIG both cap a bottom
 * tab bar at five destinations, and Android's native bar cannot show more.
 */
export const MAX_FEATURE_TABS = 4;

export interface Feature {
  id: FeatureId;
  /** Home grid label. */
  title: string;
  /** Tab bar / toolbar label. */
  tabLabel: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  /** Material Symbols name; the Quasar app's icons, kept for familiarity. */
  md: AndroidSymbol;
}

export const FEATURES: Record<FeatureId, Feature> = {
  promo: {
    id: 'promo',
    title: '建北特約',
    tabLabel: '特約',
    sf: { default: 'storefront', selected: 'storefront.fill' },
    md: 'store',
  },
  souvenir: {
    id: 'souvenir',
    title: '校慶紀念品',
    tabLabel: '紀念品',
    sf: { default: 'bag', selected: 'bag.fill' },
    md: 'shopping_bag',
  },
  todo: {
    id: 'todo',
    title: '行事曆',
    tabLabel: '行事曆',
    sf: { default: 'calendar', selected: 'calendar' },
    md: 'calendar_month',
  },
  transport: {
    id: 'transport',
    title: '交通',
    tabLabel: '交通',
    sf: { default: 'figure.walk', selected: 'figure.walk' },
    md: 'directions_walk',
  },
  menu: {
    id: 'menu',
    title: '熱食部',
    tabLabel: '熱食部',
    sf: { default: 'fork.knife', selected: 'fork.knife' },
    md: 'restaurant',
  },
  food: {
    id: 'food',
    title: '美食',
    tabLabel: '美食',
    sf: { default: 'takeoutbag.and.cup.and.straw', selected: 'takeoutbag.and.cup.and.straw.fill' },
    md: 'fastfood',
  },
  news: {
    id: 'news',
    title: '校網',
    tabLabel: '校網',
    sf: { default: 'newspaper', selected: 'newspaper.fill' },
    md: 'newspaper',
  },
  schedule: {
    id: 'schedule',
    title: '課表',
    tabLabel: '課表',
    sf: { default: 'book', selected: 'book.fill' },
    md: 'book',
  },
  help: {
    id: 'help',
    title: '選擇障礙小幫手',
    tabLabel: '小幫手',
    sf: { default: 'questionmark.circle', selected: 'questionmark.circle.fill' },
    md: 'help',
  },
};

/** Home grid order, as in the Quasar app. */
export const HOME_GRID_ORDER: readonly FeatureId[] = FEATURE_IDS;

export function isTabFeature(id: string): id is TabFeatureId {
  return (TAB_FEATURE_IDS as readonly string[]).includes(id);
}
