import { router, Stack } from 'expo-router';

import { icons } from '@/components/icons';
import { EmptyState, ListScreen, Section } from '@/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '找不到頁面' }} />
      <ListScreen>
        <Section plain>
          <EmptyState
            icon={icons.help}
            title="找不到這個頁面"
            action={{ label: '回到首頁', onPress: () => router.replace('/') }}
          />
        </Section>
      </ListScreen>
    </>
  );
}
