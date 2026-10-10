import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { HeaderActionsProps, HeaderItem, HeaderMenuEntry } from './header-actions.types';

/** Every pressable a header item offers: menus (and their submenus) are spread out as plain buttons. */
function buttonsOf(item: HeaderItem): { key: string; label: string; onPress: () => void; disabled?: boolean }[] {
  if (item.kind === 'segmented') {
    return item.options.map((option) => ({
      key: `${item.key}-${option.value}`,
      label: option.value === item.value ? `• ${option.label}` : option.label,
      onPress: () => item.onChange(option.value),
    }));
  }
  if (item.kind !== 'menu') return [item];
  const actions = item.actions.flatMap((entry: HeaderMenuEntry) => (entry.kind === 'submenu' ? entry.actions : [entry]));
  return actions.map((action) => ({ ...action, disabled: item.disabled }));
}

function ActionRow({ items }: { items: HeaderItem[] }) {
  return <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12 }}>
    {items.flatMap(buttonsOf).map((item) =>
      <Pressable key={item.key} accessibilityRole="button" onPress={item.onPress}
        disabled={item.disabled === true} style={{ padding: 8 }}><Text>{item.label}</Text></Pressable>)}
  </View>;
}

export function HeaderActions({ left, right }: HeaderActionsProps) {
  return <Stack.Screen options={{
    headerLeft: left?.length ? () => <ActionRow items={left} /> : undefined,
    headerRight: right?.length ? () => <ActionRow items={right} /> : undefined,
  }} />;
}
