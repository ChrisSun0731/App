import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
const subscribe = () => () => {};
const hydrated = () => true;
const server = () => false;

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, hydrated, server);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
