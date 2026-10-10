import { useWindowDimensions } from 'react-native';

import { isAccessibilityTextSize } from './helpers';

/** Whether the text is at an accessibility size, where SwiftUI's isAccessibilitySize is true. */
export function useAccessibilityTextSize(): boolean {
  return isAccessibilityTextSize(useWindowDimensions().fontScale);
}
