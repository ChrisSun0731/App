// The Android kit: Jetpack Compose Material 3 through @expo/ui/jetpack-compose.
// See docs/design/native-ui.md for the component mapping and src/ui/types.ts
// for the contract. The components live in ./android/; every screen renders
// inside ListScreen's Host, seeded with the CK navy (light/dark follow the
// system), so the kit reads its colours from that Host's palette.
import { MonthCalendar } from './android/calendar';
import { CrowdBar, Embedded, EmptyState, Loading, MetricPills, Notice, TextBlock, TileGrid } from './android/content';
import { FilterChips, PickerRow, TextFieldRow } from './android/controls';
import { ButtonRow, CheckRow, DateRow, Row, ToggleRow } from './android/rows';
import { ListScreen, Section } from './android/screen';
import type { Kit } from './types';

export {
  ButtonRow,
  CheckRow,
  CrowdBar,
  DateRow,
  Embedded,
  EmptyState,
  FilterChips,
  ListScreen,
  Loading,
  MetricPills,
  MonthCalendar,
  Notice,
  PickerRow,
  Row,
  Section,
  TextBlock,
  TextFieldRow,
  TileGrid,
  ToggleRow,
};

// Compile-time check that this file implements the whole contract.
export default {
  ListScreen,
  Section,
  Row,
  CheckRow,
  ToggleRow,
  PickerRow,
  TextFieldRow,
  DateRow,
  ButtonRow,
  TextBlock,
  EmptyState,
  Notice,
  Loading,
  FilterChips,
  TileGrid,
  MonthCalendar,
  MetricPills,
  CrowdBar,
  Embedded,
} satisfies Kit;
