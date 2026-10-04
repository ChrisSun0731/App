import { Box, Column, Icon, IconButton, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxWidth,
  height,
  padding,
  selectable,
  semantics,
  Shapes,
  size,
  weight,
  wrapContentHeight,
} from '@expo/ui/jetpack-compose/modifiers';

import { icons } from '@/components/icons';

import type { CalendarCell, MonthCalendarProps } from '../types';
import { chunk, withAlpha } from './helpers';
import { iconSource, roundedShape, TRANSPARENT, useM3 } from './theme';

/** At most this many indicators fit under a day number. */
const MAX_INDICATORS = 3;

/** Size of the day-number circle. */
const DAY_SIZE = 32;

// A rounded-corner shape at half the size is an exact circle; @expo/ui's
// Shape.Circle is a polygon whose radius defaults to 0 natively (ShapeView.kt).
const DAY_SHAPE = roundedShape(DAY_SIZE / 2);

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
  const m = useM3();
  return (
    <Column modifiers={[fillMaxWidth(), padding(8, 4, 8, 12)]}>
      <Row verticalAlignment="center" modifiers={[fillMaxWidth(), padding(8, 0, 0, 4)]}>
        <Text color={m.onSurface} style={{ typography: 'titleMedium' }} modifiers={[weight(1)]}>
          {title}
        </Text>
        <IconButton onClick={onPrevious}>
          <Icon source={iconSource(icons.chevronLeft)} size={24} contentDescription="上個月" />
        </IconButton>
        <IconButton onClick={onToday}>
          <Icon source={iconSource(icons.today)} size={24} contentDescription="今天" />
        </IconButton>
        <IconButton onClick={onNext}>
          <Icon source={iconSource(icons.chevronRight)} size={24} contentDescription="下個月" />
        </IconButton>
      </Row>
      <Row modifiers={[fillMaxWidth(), padding(0, 0, 0, 4)]}>
        {weekdays.map((weekday) => (
          <Text
            key={weekday}
            color={m.onSurfaceVariant}
            style={{ typography: 'labelMedium', textAlign: 'center' }}
            modifiers={[weight(1)]}>
            {weekday}
          </Text>
        ))}
      </Row>
      {chunk(cells, 7).map((week) => (
        <Row key={week[0].key} modifiers={[fillMaxWidth()]}>
          {week.map((cell) => (
            <DayCell key={cell.key} cell={cell} selected={cell.key === selectedKey} onSelect={onSelect} />
          ))}
        </Row>
      ))}
    </Column>
  );
}

function DayCell({ cell, selected, onSelect }: { cell: CalendarCell; selected: boolean; onSelect: (key: string) => void }) {
  const m = useM3();
  const today = cell.isToday && !selected;
  let color: string = m.onSurface;
  if (selected) color = m.onPrimaryContainer;
  else if (cell.isToday) color = m.primary;
  else if (!cell.inMonth) color = withAlpha(m.onSurfaceVariant, 0.5);

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: 3 }}
      modifiers={[
        weight(1),
        height(52),
        clip(Shapes.RoundedCorner(12)),
        // Selectable exposes the selected state; the label replaces the bare day number.
        selectable(selected, () => onSelect(cell.key)),
        semantics({ contentDescription: cell.accessibilityLabel }),
        padding(0, 4, 0, 0),
      ]}>
      {/* Selected day: a primaryContainer circle. Today: a primary ring and bold primary number. */}
      <Surface
        color={selected ? m.primaryContainer : TRANSPARENT}
        contentColor={color}
        shape={DAY_SHAPE}
        border={today ? { width: 1, color: m.primary } : undefined}
        modifiers={[size(DAY_SIZE, DAY_SIZE)]}>
        <Text
          color={color}
          style={{ typography: 'bodyMedium', textAlign: 'center', fontWeight: selected || cell.isToday ? '700' : undefined }}
          // The surface stretches its child to its own size; centre the line vertically.
          modifiers={[wrapContentHeight('centerVertically')]}>
          {String(cell.day)}
        </Text>
      </Surface>
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 2 }} modifiers={[height(6)]}>
        {cell.indicators.slice(0, MAX_INDICATORS).map((indicator) => (
          <Box
            key={indicator.key}
            modifiers={[
              size(5, 5),
              clip(indicator.shape === 'dot' ? Shapes.Circle : Shapes.RoundedCorner(1)),
              background(cell.inMonth ? indicator.color : withAlpha(indicator.color, 0.5)),
            ]}
          />
        ))}
      </Row>
    </Column>
  );
}
