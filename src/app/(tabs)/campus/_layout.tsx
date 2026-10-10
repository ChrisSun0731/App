import { CAMPUS_SCREENS } from '@/features/registry';
import { TabStack } from '@/navigation/tab-stack';

// A link straight to a pushed screen (e.g. /campus/news) keeps the hub beneath it.
export const unstable_settings = { initialRouteName: 'index' };

export default function Layout() {
  return <TabStack title="校園" screens={CAMPUS_SCREENS} />;
}
