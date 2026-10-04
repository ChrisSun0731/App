import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { HeaderActionsProps, HeaderItem } from './header-actions.types';

function ActionRow({ items }: { items: HeaderItem[] }) {
  return <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12 }}>
    {items.flatMap((item) => item.kind === 'menu' ? item.actions : [item]).map((item) =>
      <Pressable key={item.key} accessibilityRole="button" onPress={item.onPress}
        disabled={'disabled' in item && item.disabled === true} style={{ padding: 8 }}><Text>{item.label}</Text></Pressable>)}
  </View>;
}

export function HeaderActions({ left, right }: HeaderActionsProps) {
  return <Stack.Screen options={{
    headerLeft: left?.length ? () => <ActionRow items={left} /> : undefined,
    headerRight: right?.length ? () => <ActionRow items={right} /> : undefined,
  }} />;
}
