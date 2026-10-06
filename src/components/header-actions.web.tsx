import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { HeaderActionsProps, HeaderItem, HeaderMenuEntry } from './header-actions.types';

interface WebButton {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}

/**
 * Every pressable a header item offers: a menu's actions are spread out as
 * plain buttons. Submenus are left out: a header row cannot hold a long list
 * (課表's 選擇班級 has one entry per class), and the screens that use one also
 * offer the choice in their content (課表's 班級 picker).
 */
function buttonsOf(item: HeaderItem): WebButton[] {
  if (item.kind === 'icon') return [{ ...item, disabled: item.disabled || item.busy }];
  if (item.kind !== 'menu') return [item];
  return item.actions
    .filter((entry: HeaderMenuEntry) => entry.kind !== 'submenu')
    .map((action) => ({ ...action, disabled: item.disabled || action.disabled }));
}

function ActionRow({ items }: { items: HeaderItem[] }) {
  return <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12 }}>
    {items.flatMap(buttonsOf).map((item) =>
      <Pressable key={item.key} accessibilityRole="button" onPress={item.onPress}
        accessibilityState={{ disabled: item.disabled === true, selected: item.selected }}
        disabled={item.disabled === true} style={{ padding: 8, opacity: item.disabled ? 0.4 : 1 }}>
        <Text>{item.selected ? `✓ ${item.label}` : item.label}</Text>
      </Pressable>)}
  </View>;
}

export function HeaderActions({ left, right }: HeaderActionsProps) {
  return <Stack.Screen options={{
    headerLeft: left?.length ? () => <ActionRow items={left} /> : undefined,
    headerRight: right?.length ? () => <ActionRow items={right} /> : undefined,
  }} />;
}
