import { Button, Circle, Grid, HStack, Image, RoundedRectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityHidden,
  accessibilityLabel,
  background,
  buttonStyle,
  contentShape,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowInsets,
  minimumScaleFactor,
  monospacedDigit,
  opacity,
  padding,
  shapes,
  underline,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';

import { usePalette } from '@/theme/palette';

import { chunk } from '../helpers';
import { CALENDAR_CELL_INDICATORS, type CalendarCell, type CalendarIndicator, type MonthCalendarProps } from '../types';
import { primaryText, secondaryText, tertiaryText, useRowChrome } from './chrome';

const INDICATOR_SIZE = 5;
const INDICATOR_SPACING = 2;

const RECT = contentShape(shapes.rectangle());

/**
 * A month grid like Calendar's: a header with the month and previous / 今天 /
 * next controls, a weekday row, and six weeks of day buttons. The cells are
 * borderless/plain buttons: SwiftUI fires every default-style button in a List
 * row on any tap, so each control needs its own non-default style.
 */
export function MonthCalendar({
  title,
  weekdays,
  cells,
  selectedKey,
  onSelect,
  onPrevious,
  onNext,
  onToday,
}: MonthCalendarProps) {
  const chrome = useRowChrome();
  return (
    <VStack
      spacing={6}
      modifiers={[
        // Narrower insets than a text row leave each of the seven columns
        // room for a day number and its indicators on small phones.
        listRowInsets({ top: 8, leading: 8, bottom: 10, trailing: 8 }),
        ...chrome,
      ]}>
      <HStack spacing={0} modifiers={[padding({ leading: 8 })]}>
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
            primaryText,
            accessibilityAddTraits(['isHeader']),
          ]}>
          {title}
        </Text>
        <Spacer minLength={8} />
        <IconButton label="上個月" symbol="chevron.left" onPress={onPrevious} />
        <Button onPress={onToday} modifiers={[buttonStyle('borderless')]}>
          <Text
            modifiers={[
              font({ textStyle: 'body', weight: 'medium' }),
              padding({ horizontal: 6 }),
              frame({ minHeight: 44 }),
              RECT,
            ]}>
            今天
          </Text>
        </Button>
        <IconButton label="下個月" symbol="chevron.right" onPress={onNext} />
      </HStack>
      {/* Dense like Calendar's month view: text grows with Dynamic Type up to
          a size seven columns can still hold, and numbers shrink to fit. */}
      <Grid horizontalSpacing={0} verticalSpacing={2} modifiers={[dynamicTypeSize({ max: 'accessibility1' })]}>
        <Grid.Row>
          {weekdays.map((weekday) => (
            <Text
              key={weekday}
              modifiers={[
                font({ textStyle: 'footnote', weight: 'medium' }),
                secondaryText,
                lineLimit(1),
                minimumScaleFactor(0.6),
                frame({ maxWidth: Infinity }),
                // Each day button speaks its full date and weekday already.
                accessibilityHidden(true),
              ]}>
              {weekday}
            </Text>
          ))}
        </Grid.Row>
        {chunk(cells, 7).map((week) => (
          <Grid.Row key={week[0].key}>
            {week.map((cell) => (
              <DayCell key={cell.key} cell={cell} selected={cell.key === selectedKey} onSelect={onSelect} />
            ))}
          </Grid.Row>
        ))}
      </Grid>
    </VStack>
  );
}

/** A 44pt borderless symbol button; the label is spoken, not shown. */
function IconButton({ label, symbol, onPress }: {
  label: string;
  symbol: 'chevron.left' | 'chevron.right';
  onPress: () => void;
}) {
  return (
    <Button onPress={onPress} modifiers={[buttonStyle('borderless'), accessibilityLabel(label)]}>
      <Image
        systemName={symbol}
        modifiers={[font({ textStyle: 'body', weight: 'semibold' }), frame({ width: 44, height: 44 }), RECT]}
      />
    </Button>
  );
}

/**
 * One day: its number (bold and underlined in the tint for today, white on a
 * tint circle when selected, dimmed outside the month) over one row of up to
 * CALENDAR_CELL_INDICATORS event dots and todo squares, the count every
 * platform draws.
 */
function DayCell({ cell, selected, onSelect }: {
  cell: CalendarCell;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const palette = usePalette();
  let numberStyle: ModifierConfig;
  if (selected) numberStyle = foregroundStyle(palette.onTint);
  else if (cell.isToday) numberStyle = foregroundStyle(palette.tint);
  else numberStyle = cell.inMonth ? primaryText : tertiaryText;

  const indicators = cell.indicators.slice(0, CALENDAR_CELL_INDICATORS);
  return (
    <Button
      onPress={() => onSelect(cell.key)}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(cell.accessibilityLabel),
        ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
      ]}>
      <VStack spacing={3} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 2 }), RECT]}>
        <Text
          modifiers={[
            font({ textStyle: 'body', weight: selected || cell.isToday ? 'semibold' : 'regular' }),
            monospacedDigit(),
            numberStyle,
            // Today is marked by more than colour (underline + weight).
            ...(cell.isToday ? [underline({ isActive: true, pattern: 'solid' })] : []),
            lineLimit(1),
            minimumScaleFactor(0.6),
            frame({ minWidth: 32, minHeight: 32 }),
            ...(selected ? [background(palette.tint, shapes.circle())] : []),
          ]}>
          {String(cell.day)}
        </Text>
        {/* A fixed height, so days without indicators keep weeks level. */}
        <HStack
          spacing={INDICATOR_SPACING}
          modifiers={[frame({ height: INDICATOR_SIZE }), ...(cell.inMonth ? [] : [opacity(0.45)])]}>
          {indicators.map((indicator) => (
            <Indicator key={indicator.key} indicator={indicator} />
          ))}
        </HStack>
      </VStack>
    </Button>
  );
}

/** Events are dots, todos small squares. */
function Indicator({ indicator }: { indicator: CalendarIndicator }) {
  const modifiers = [foregroundStyle(indicator.color), frame({ width: INDICATOR_SIZE, height: INDICATOR_SIZE })];
  return indicator.shape === 'dot' ? (
    <Circle modifiers={modifiers} />
  ) : (
    <RoundedRectangle cornerRadius={1} modifiers={modifiers} />
  );
}
