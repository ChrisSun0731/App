// The 可借 / 可還 pills of a YouBike row (交通 and /youbike-picker). Kept apart
// from transport-view.ts, which stays free of native icon modules for Jest.
import { icons } from '@/components/icons';
import type { MetricPillsProps } from '@/ui';

import { availabilityMetrics } from './transport-view';
import type { YoubikeStation } from './youbike';

const ICONS = { rent: icons.rent, dock: icons.dock };

/** MetricPills' metrics for a station: counts in availability colours, with a bike or dock symbol. */
export function availabilityPills(station: YoubikeStation | undefined): MetricPillsProps['metrics'] {
  return availabilityMetrics(station).map((metric) => ({ ...metric, icon: ICONS[metric.key] }));
}
