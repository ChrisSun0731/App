import { Box, Column, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import { clip, fillMaxWidth, semantics, Shapes, size, weight, background } from '@expo/ui/jetpack-compose/modifiers';

import type { DayStripDay, DayStripProps } from '../types';
import { joinLabel } from './helpers';
import { roundedShape, useM3 } from './theme';

/**
 * The school week as a row of days (weekday over date): the selected date in
 * a primary circle, today's weekday in the primary colour under the 倒三角, a
 * day off red over its caption.
 */
export function DayStrip({ days, selectedKey, onSelect }: DayStripProps) {
  return (
    <Row modifiers={[fillMaxWidth()]}>
      {days.map((day) => (
        <Day key={day.key} day={day} selected={day.key === selectedKey} onSelect={onSelect} />
      ))}
    </Row>
  );
}

function Day({ day, selected, onSelect }: { day: DayStripDay; selected: boolean; onSelect: (key: string) => void }) {
  const m = useM3();
  let numberColor = m.onSurface;
  if (selected) numberColor = m.onPrimary;
  else if (day.holiday) numberColor = m.error;
  else if (day.isToday) numberColor = m.primary;
  return (
    <Surface
      onClick={() => onSelect(day.key)}
      color="#00000000"
      shape={roundedShape(16)}
      modifiers={[
        weight(1),
        semantics({ contentDescription: joinLabel([day.accessibilityLabel, selected ? '已選取' : undefined]) }),
      ]}>
      <Column horizontalAlignment="center" modifiers={[fillMaxWidth()]}>
        <Text color={day.isToday ? m.primary : '#00000000'} style={{ fontSize: 10 }}>
          ▼
        </Text>
        <Text color={day.isToday ? m.primary : m.onSurfaceVariant} style={{ typography: 'labelMedium' }}>
          {day.weekday}
        </Text>
        <Box
          contentAlignment="center"
          modifiers={[size(40, 40), clip(Shapes.Circle), ...(selected ? [background(m.primary)] : [])]}>
          <Column horizontalAlignment="center">
            <Text color={numberColor} style={{ typography: 'titleMedium', fontWeight: '600' }}>
              {day.day}
            </Text>
            {day.holiday ? (
              <Text color={numberColor} style={{ fontSize: 9, fontWeight: '600' }}>
                {day.holiday}
              </Text>
            ) : null}
          </Column>
        </Box>
      </Column>
    </Surface>
  );
}
