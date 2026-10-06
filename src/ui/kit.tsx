// Fallback kit in plain React Native views, for web and Jest, and the module
// TypeScript resolves `./kit` to. Phones load kit.ios.tsx (SwiftUI) or
// kit.android.tsx (Compose). It is deliberately simple: same props and
// behaviour, generic styling, no icons (IconValue is an SF Symbol name or an
// Android vector asset, neither of which renders here).
import {
  Children,
  Fragment,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ColorValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMonthDay, fromDateKey, isDateKey } from '@/lib/dates';
import { usePalette } from '@/theme/palette';

import { overflowMenuLabel } from './labels';
import {
  CALENDAR_CELL_INDICATORS,
  type ButtonRowProps,
  type CheckRowProps,
  type CrowdBarProps,
  type DateRowProps,
  type EmbeddedProps,
  type EmptyStateProps,
  type FilterChipsProps,
  type Kit,
  type ListScreenProps,
  type LoadingProps,
  type MetricPillsProps,
  type MonthCalendarProps,
  type NoticeProps,
  type PickerRowProps,
  type RowAction,
  type RowProps,
  type SectionProps,
  type TextBlockProps,
  type TextFieldRowProps,
  type TileGridProps,
  type ToggleRowProps,
} from './types';

/** Kit children with fragments expanded, so sections can separate rows. */
function rowsOf(children: ReactNode): ReactElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    return child.type === Fragment ? rowsOf((child.props as { children?: ReactNode }).children) : [child];
  });
}

export function ListScreen({ children, onRefresh, refreshing = false, fab }: ListScreenProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [pulling, setPulling] = useState(false);
  async function refresh() {
    if (!onRefresh) return;
    setPulling(true);
    try {
      await onRefresh();
    } catch {
      // Screens show their own error state.
    } finally {
      setPulling(false);
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing || pulling} onRefresh={() => void refresh()} /> : undefined
        }
        contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + (fab ? 96 : 24) }]}>
        {children}
      </ScrollView>
      {fab ? (
        <Pressable
          accessibilityRole="button"
          onPress={fab.onPress}
          style={[styles.fab, { backgroundColor: palette.tintContainer, bottom: insets.bottom + 16 }]}>
          <Text style={[styles.label, { color: palette.onTintContainer }]}>{fab.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Section({ title, footer, plain = false, children }: SectionProps) {
  const palette = usePalette();
  const rows = rowsOf(children);
  return (
    <View style={styles.section}>
      {title ? (
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.tint }]}>
          {title}
        </Text>
      ) : null}
      {rows.length > 0 ? (
        <View style={plain ? styles.plain : [styles.card, { backgroundColor: palette.surface }]}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 && !plain ? <View style={[styles.separator, { backgroundColor: palette.separator }]} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {footer ? <Text style={[styles.footer, { color: palette.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

/** A row's actions behind a ⋯ button named after the row; available on a disabled row too. */
function Actions({ actions, rowName }: { actions: readonly RowAction[]; rowName: string }) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={overflowMenuLabel(rowName)}
        onPress={() => setOpen(!open)}
        hitSlop={8}>
        <Text style={[styles.detail, { color: palette.textSecondary }]}>⋯</Text>
      </Pressable>
      {open
        ? actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              disabled={action.disabled}
              style={action.disabled ? styles.disabled : null}
              onPress={() => {
                setOpen(false);
                action.onPress();
              }}>
              <Text style={[styles.detail, { color: action.destructive ? palette.danger : palette.tint }]}>
                {action.label}
              </Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

function Dot({ color }: { color: ColorValue }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function Row(props: RowProps) {
  const palette = usePalette();
  const { title, subtitle, overline, detail, dotColor, background, badge, emphasized, titleLines = 2, accessory = 'none' } = props;
  const label = props.accessibilityLabel ?? [title, overline, subtitle, detail, badge].filter(Boolean).join('，');
  // `disabled` dims the row's own content and turns off its tap; the toggle
  // and actions stay usable.
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled || !props.onPress}
      onPress={props.onPress}
      style={[styles.row, background ? { backgroundColor: background } : null]}>
      {dotColor && !props.icon ? <Dot color={dotColor} /> : null}
      <View style={[styles.rowBody, props.disabled ? styles.disabled : null]}>
        {overline ? <Text style={[styles.overline, { color: palette.textSecondary }]}>{overline}</Text> : null}
        <View style={styles.inline}>
          <Text
            numberOfLines={titleLines}
            style={[styles.title, { color: emphasized ? palette.tint : palette.text }, emphasized ? styles.bold : null]}>
            {title}
          </Text>
          {badge ? (
            <Text style={[styles.badge, { backgroundColor: palette.tintContainer, color: palette.onTintContainer }]}>
              {badge}
            </Text>
          ) : null}
        </View>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
        {props.footer}
      </View>
      {detail ? <Text style={[styles.detail, { color: palette.textSecondary }]}>{detail}</Text> : null}
      {props.toggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.toggle.label}
          accessibilityState={{ selected: props.toggle.active }}
          onPress={props.toggle.onPress}
          hitSlop={8}>
          <Text style={[styles.detail, { color: palette.tint }]}>{props.toggle.active ? '★' : '☆'}</Text>
        </Pressable>
      ) : null}
      {props.actions?.length ? <Actions actions={props.actions} rowName={title} /> : null}
      {accessory !== 'none' ? (
        <Text style={[styles.detail, { color: accessory === 'checkmark' ? palette.tint : palette.textTertiary }]}>
          {accessory === 'chevron' ? '›' : accessory === 'external' ? '↗' : '✓'}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CheckRow({ title, subtitle, checked, onCheckedChange, onPress, actions }: CheckRowProps) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={title}
        onPress={() => onCheckedChange(!checked)}
        hitSlop={8}>
        <Text style={[styles.check, { color: palette.tint }]}>{checked ? '☑' : '☐'}</Text>
      </Pressable>
      <Pressable style={styles.rowBody} disabled={!onPress} onPress={onPress}>
        <Text style={[styles.title, { color: checked ? palette.textSecondary : palette.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
      </Pressable>
      {actions?.length ? <Actions actions={actions} rowName={title} /> : null}
    </View>
  );
}

export function ToggleRow({ label, subtitle, value, onValueChange, disabled, actions }: ToggleRowProps) {
  const palette = usePalette();
  // Only the switch (and its label) dim while disabled; the actions stay usable.
  return (
    <View style={styles.row}>
      <View style={[styles.rowBody, disabled ? styles.disabled : null]}>
        <Text style={[styles.title, { color: palette.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} disabled={disabled} />
      {actions?.length ? <Actions actions={actions} rowName={label} /> : null}
    </View>
  );
}

export function PickerRow<T extends string>({ label, value, options, onChange, variant = 'menu', disabled }: PickerRowProps<T>): ReactNode {
  const palette = usePalette();
  return (
    <View style={[styles.field, disabled ? styles.disabled : null]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {variant === 'menu' ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{label}</Text> : null}
      <View style={styles.wrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              // The control renders `value` only, so an ignored change leaves it as it was.
              onPress={() => (selected ? undefined : onChange(option.value))}
              style={[styles.chip, { borderColor: palette.separator }, selected ? { backgroundColor: palette.tintContainer } : null]}>
              <Text style={[styles.label, { color: selected ? palette.onTintContainer : palette.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const KEYBOARDS = { default: 'default', url: 'url', email: 'email-address', numeric: 'numeric' } as const;

export function TextFieldRow({ label, value, onChangeText, placeholder, multiline, keyboard = 'default', autoFocus, maxLength }: TextFieldRowProps) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={palette.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={KEYBOARDS[keyboard]}
        autoCapitalize="none"
        autoFocus={autoFocus}
        maxLength={maxLength}
        style={[styles.input, { color: palette.text, borderColor: palette.separator }, multiline ? styles.multiline : null]}
      />
    </View>
  );
}

export function DateRow({ label, value, onChange, minimumDate }: DateRowProps) {
  const palette = usePalette();
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    // Adopt changes made elsewhere (e.g. a reset) into the text being edited.
    setShown(value);
    setDraft(value);
  }
  function edit(text: string) {
    setDraft(text);
    if (isDateKey(text) && (!minimumDate || text >= minimumDate)) onChange(text);
  }
  return (
    <View style={styles.field}>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        {label}
        {isDateKey(value) ? ` · ${formatMonthDay(fromDateKey(value))}` : ''}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={draft}
        onChangeText={edit}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={palette.textTertiary}
        style={[styles.input, { color: palette.text, borderColor: palette.separator }]}
      />
    </View>
  );
}

export function ButtonRow({ label, role = 'default', prominent, disabled, onPress }: ButtonRowProps) {
  const palette = usePalette();
  const color = role === 'destructive' ? palette.danger : palette.tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, prominent ? [styles.prominent, { backgroundColor: color }] : null, disabled ? styles.disabled : null]}>
      <Text style={[styles.title, styles.bold, { color: prominent ? palette.onTint : color }]}>{label}</Text>
    </Pressable>
  );
}

export function TextBlock({ text, secondary, size = 'body', selectable }: TextBlockProps) {
  const palette = usePalette();
  return (
    <Text
      selectable={selectable}
      style={[styles.block, size === 'large' ? styles.large : null, { color: secondary ? palette.textSecondary : palette.text }]}>
      {text}
    </Text>
  );
}

export function EmptyState({ title, description, action, secondaryAction }: EmptyStateProps) {
  const palette = usePalette();
  return (
    <View style={styles.empty}>
      <Text style={[styles.title, styles.bold, { color: palette.text }]}>{title}</Text>
      {description ? <Text style={[styles.subtitle, styles.center, { color: palette.textSecondary }]}>{description}</Text> : null}
      {[action, secondaryAction].map((item) =>
        item ? (
          <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress}>
            <Text style={[styles.label, { color: palette.tint }]}>{item.label}</Text>
          </Pressable>
        ) : null,
      )}
    </View>
  );
}

export function Notice({ tone, title, message, action }: NoticeProps) {
  const palette = usePalette();
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[styles.notice, { backgroundColor: palette.surfaceHighlight }]}>
      <Text style={[styles.title, styles.bold, { color: tone === 'error' ? palette.danger : palette.text }]}>{title}</Text>
      {message ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{message}</Text> : null}
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress}>
          <Text style={[styles.label, { color: palette.tint }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loading({ label }: LoadingProps) {
  const palette = usePalette();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={palette.tint} />
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function FilterChips({ options, onToggle }: FilterChipsProps) {
  const palette = usePalette();
  return (
    <View style={styles.wrap}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: option.selected }}
          onPress={() => onToggle(option.key)}
          style={[styles.chip, { borderColor: palette.separator }, option.selected ? { backgroundColor: palette.tintContainer } : null]}>
          <Text style={[styles.label, { color: option.selected ? palette.onTintContainer : palette.text }]}>
            {option.selected ? `✓ ${option.label}` : option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TileGrid({ tiles, columns = 3 }: TileGridProps) {
  const palette = usePalette();
  return (
    <View style={[styles.wrap, styles.tiles]}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          onPress={tile.onPress}
          style={[styles.tile, { width: `${100 / Math.max(1, columns)}%` }]}>
          <View style={[styles.tileInner, { backgroundColor: palette.surfaceHighlight }]}>
            <Text numberOfLines={1} style={[styles.label, { color: palette.text }]}>{tile.title}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function MonthCalendar({ title, weekdays, cells, selectedKey, onSelect, onPrevious, onNext, onToday }: MonthCalendarProps) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <View style={styles.inline}>
        <Text style={[styles.title, styles.bold, styles.grow, { color: palette.text }]}>{title}</Text>
        {([['‹', '上個月', onPrevious], ['今天', '今天', onToday], ['›', '下個月', onNext]] as const).map(([text, a11y, press]) => (
          <Pressable key={a11y} accessibilityRole="button" accessibilityLabel={a11y} onPress={press} hitSlop={8}>
            <Text style={[styles.label, { color: palette.tint }]}>{text}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={[styles.cell, styles.center, { color: palette.textSecondary }]}>{weekday}</Text>
        ))}
        {cells.map((cell) => {
          const selected = cell.key === selectedKey;
          return (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              accessibilityLabel={cell.accessibilityLabel}
              accessibilityState={{ selected }}
              onPress={() => onSelect(cell.key)}
              style={[styles.cell, selected ? { backgroundColor: palette.tintContainer } : null]}>
              <Text
                style={[
                  styles.center,
                  { color: cell.isToday ? palette.tint : cell.inMonth ? palette.text : palette.textTertiary },
                  cell.isToday ? styles.bold : null,
                ]}>
                {cell.day}
              </Text>
              <View style={[styles.inline, styles.indicators]}>
                {cell.indicators.slice(0, CALENDAR_CELL_INDICATORS).map((indicator) => (
                  <View
                    key={indicator.key}
                    style={[styles.indicator, { backgroundColor: indicator.color }, indicator.shape === 'dot' ? styles.round : null]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MetricPills({ metrics }: MetricPillsProps) {
  const palette = usePalette();
  return (
    <View style={styles.wrap}>
      {metrics.map((metric) => (
        <View key={metric.key} style={[styles.inline, styles.pill, { backgroundColor: palette.surfaceHighlight }]}>
          <Dot color={metric.color} />
          <Text style={[styles.overline, { color: palette.text }]}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function CrowdBar({ levels, accessibilityLabel }: CrowdBarProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.inline}>
      {levels.map((level) => (
        <View key={level.key} style={[styles.car, { backgroundColor: level.color }]} />
      ))}
    </View>
  );
}

export function Embedded({ children, height, aspectRatio }: EmbeddedProps) {
  return (
    <View style={[styles.embedded, height != null ? { height } : { aspectRatio: aspectRatio ?? 4 / 3 }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  fab: { position: 'absolute', right: 16, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', paddingHorizontal: 16 },
  footer: { fontSize: 12, paddingHorizontal: 16 },
  card: { borderRadius: 16, overflow: 'hidden' },
  plain: { gap: 8 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  rowBody: { flex: 1, gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grow: { flex: 1 },
  title: { fontSize: 16, flexShrink: 1 },
  subtitle: { fontSize: 14 },
  overline: { fontSize: 12 },
  detail: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500' },
  bold: { fontWeight: '600' },
  center: { textAlign: 'center' },
  badge: { fontSize: 12, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  disabled: { opacity: 0.4 },
  check: { fontSize: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  prominent: { justifyContent: 'center', borderRadius: 24, margin: 12 },
  block: { fontSize: 16, lineHeight: 24, paddingHorizontal: 16, paddingVertical: 10 },
  large: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  notice: { padding: 16, gap: 6, borderRadius: 16 },
  tiles: { gap: 0, padding: 6 },
  tile: { padding: 6 },
  tileInner: { borderRadius: 16, paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center' },
  // Seven columns with no gap between them: a gap would push the seventh cell to the next line.
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  indicators: { height: 6, gap: 2 },
  indicator: { width: 5, height: 5, borderRadius: 1 },
  round: { borderRadius: 2.5 },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  car: { width: 18, height: 8, borderRadius: 4 },
  embedded: { width: '100%', overflow: 'hidden' },
});

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
