// The 美食 tab: the cafeteria menu (熱食部) and the restaurants nearby (附近),
// both answers to "what's for lunch", switched with a segmented control in
// either screen's navigation bar, beside its own actions.
// Links (今天's 午餐) pass `view` (menu | nearby) and, for the menu, `date`.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

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
  const requested: FoodView | null = params.view === 'menu' || params.view === 'nearby' ? params.view : null;
  const date = isDateKey(params.date) ? params.date : undefined;
  const [view, setView] = useState<FoodView>(requested ?? 'menu');

  // A new link switches the view even when the tab is already open (state
  // adjusted while rendering, keyed on the link's parameters).
  const link = `${requested ?? ''}|${date ?? ''}`;
  const [seenLink, setSeenLink] = useState(link);
  if (link !== seenLink) {
    setSeenLink(link);
    if (requested) setView(requested);
  }

  const switcher: HeaderItem = {
    kind: 'segmented',
    key: 'view',
    label: '美食',
    options: VIEW_OPTIONS,
    value: view,
    onChange: (next) => setView(next as FoodView),
  };
  // Keyed on the date so a link to another day's menu opens on that day.
  return view === 'menu' ? <MenuScreen key={date ?? 'today'} switcher={switcher} date={date} /> : <FoodScreen switcher={switcher} />;
}
