import { Stack, useLocalSearchParams } from 'expo-router';

import { icons } from '@/components/icons';
import { FEATURES, FEATURE_IDS, type FeatureId } from '@/features/registry';
import { FEATURE_SCREENS } from '@/features/screens';
import { EmptyState, ListScreen, Section } from '@/ui';

export default function FeatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!(FEATURE_IDS as readonly string[]).includes(id)) {
    return (
      <>
        <Stack.Screen options={{ title: '找不到頁面' }} />
        <ListScreen>
          <Section plain>
            <EmptyState icon={icons.help} title="這個功能不存在。" />
          </Section>
        </ListScreen>
      </>
    );
  }
  const feature = id as FeatureId;
  const Component = FEATURE_SCREENS[feature];
  return (
    <>
      <Stack.Screen options={{ title: FEATURES[feature].title }} />
      <Component />
    </>
  );
}
