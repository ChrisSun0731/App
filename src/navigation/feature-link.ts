import { router, type Href } from 'expo-router';

import { isTabFeature, type FeatureId } from '@/features/registry';
import { useSettingsStore } from '@/store/settings';

/** Hidden native tabs cannot be focused; unpinned features use the root stack. */
export function featureHref(id: FeatureId): Href {
  const pinned = isTabFeature(id) && useSettingsStore.getState().toolbar.some((item) => item.id === id && item.visible);
  return pinned ? `/(tabs)/${id}` as Href : { pathname: '/feature/[id]', params: { id } };
}

export function openFeature(id: FeatureId) {
  router.navigate(featureHref(id));
}
