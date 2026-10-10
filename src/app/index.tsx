import { Redirect } from 'expo-router';

import { useSettingsStore } from '@/store/settings';

/** A new install asks 你是哪一班？ first; afterwards the app opens on 今天. */
export default function Index() {
  const welcomed = useSettingsStore((state) => state.welcomed);
  return <Redirect href={welcomed ? '/(tabs)/home' : '/welcome'} />;
}
