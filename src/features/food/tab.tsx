// The 美食 tab: the cafeteria menu (熱食部) and the restaurants nearby (附近),
// both answers to "what's for lunch", switched with a segmented control in
// either screen's navigation bar, beside its own actions.
//
// Which one shows is the route's `view` param (menu | nearby; the menu also
// takes a `date`), not state of its own. Links (今天's 午餐 rows, the 現在
// card at lunch) replace this screen's params on every tap, even with the
// same values as last time, and the control writes the param too; so a link
// followed again after switching by hand still opens its view. Switching by
// hand keeps the link's date (setParams merges), so 熱食部 comes back on it.
import { router, useLocalSearchParams } from 'expo-router';

import type { HeaderItem } from '@/components/header-actions';
import MenuScreen from '@/features/menu/screen';
import { isDateKey } from '@/lib/dates';
import type { ChoiceOption } from '@/ui';

import FoodScreen from './screen';

type FoodView = 'menu' | 'nearby';

const VIEW_OPTIONS: readonly ChoiceOption<FoodView>[] = [
  { label: '熱食部', value: 'menu' },
  { label: '附近', value: 'nearby' },
];

export default function FoodTab() {
  const params = useLocalSearchParams<{ view?: string; date?: string }>();
  const view: FoodView = params.view === 'nearby' ? 'nearby' : 'menu';
  const date = isDateKey(params.date) ? params.date : undefined;

  const switcher: HeaderItem = {
    kind: 'segmented',
    key: 'view',
    label: '美食',
    options: VIEW_OPTIONS,
    value: view,
    // The control is only on screen while this route is the focused one,
    // which is the route setParams updates.
    onChange: (next) => router.setParams({ view: next }),
  };
  // Keyed on the date so a link to another day's menu opens on that day.
  return view === 'menu' ? <MenuScreen key={date ?? 'today'} switcher={switcher} date={date} /> : <FoodScreen switcher={switcher} />;
}
