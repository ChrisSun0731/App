import { Stack } from 'expo-router';

import { LARGE_TITLE, useStackScreenOptions } from './stack-options';

/**
 * A tab's stack: its root screen (`index`) titled `title`, with a large title
 * on iOS, plus any screens the tab pushes, each with its own inline title.
 */
export function TabStack({ title, screens = [] }: { title: string; screens?: readonly { name: string; title: string }[] }) {
  const options = useStackScreenOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title, ...LARGE_TITLE }} />
      {screens.map((screen) => <Stack.Screen key={screen.name} name={screen.name} options={{ title: screen.title }} />)}
    </Stack>
  );
}
