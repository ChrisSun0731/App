import { Stack, useLocalSearchParams } from 'expo-router';

import { Body, Screen } from '@/components/ui/page';
import { FEATURES, FEATURE_IDS, type FeatureId } from '@/features/registry';
import { FEATURE_SCREENS } from '@/features/screens';

export default function FeatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!(FEATURE_IDS as readonly string[]).includes(id)) {
    return <Screen><Stack.Screen options={{ title: '找不到頁面' }} /><Body>這個功能不存在。</Body></Screen>;
  }
  const feature = id as FeatureId;
  const Component = FEATURE_SCREENS[feature];
  return <><Stack.Screen options={{ title: FEATURES[feature].title }} /><Component /></>;
}
