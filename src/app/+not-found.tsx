import { router, Stack } from 'expo-router';
import { ActionButton, Body, Screen } from '@/components/ui/page';

export default function NotFoundScreen() {
  return <Screen><Stack.Screen options={{ title: '找不到頁面' }} /><Body>找不到這個頁面。</Body>
    <ActionButton label="回到首頁" onPress={() => router.replace('/')} />
  </Screen>;
}
