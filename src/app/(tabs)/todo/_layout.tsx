import { TabStack } from '@/navigation/tab-stack';

// A link straight to /todo/list keeps the calendar beneath it.
export const unstable_settings = { initialRouteName: 'index' };

const SCREENS = [{ name: 'list', title: '待辦' }] as const;

export default function Layout() {
  return <TabStack title="行事曆" screens={SCREENS} />;
}
