// The iOS kit: SwiftUI through @expo/ui/swift-ui. See docs/design/native-ui.md
// for the component mapping and src/ui/types.ts for the contract. The
// components live in ./ios/; every screen is one inset-grouped SwiftUI List
// inside ListScreen's Host, tinted with the CK navy (lifted in dark mode), and
// the kit draws with semantic system colours so light/dark and Increase
// Contrast follow the system.
import { Embedded, EmptyState, FilterChips, Loading, Notice, TextBlock, TileGrid } from './ios/blocks';
import { MonthCalendar } from './ios/calendar';
import { CrowdBar, MetricPills } from './ios/inline';
import { DateRow, PickerRow, TextFieldRow } from './ios/inputs';
import { ListScreen, Section } from './ios/list';
import { ButtonRow, CheckRow, Row, ToggleRow } from './ios/rows';
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
