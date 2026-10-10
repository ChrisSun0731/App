import { Button, Circle, HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  listRowInsets,
  monospacedDigit,
  opacity,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { usePalette } from '@/theme/palette';

import type { DayStripDay, DayStripProps } from '../types';
import { DESTRUCTIVE, labelText, secondaryLabelText, useRowChrome } from './chrome';

const CIRCLE = 40;

/**
 * The school week on the grouped background: one plain button per day with
 * the weekday over the date. The 倒三角 sits over today's weekday, the
 * selected date fills a tint circle, and a day off is red with its caption.
 * Plain buttons: SwiftUI fires every default-style button in a List row on
 * any tap.
 */
export function DayStrip({ days, selectedKey, onSelect }: DayStripProps) {
  const chrome = useRowChrome();
  return (
    <HStack
      spacing={0}
      modifiers={[listRowInsets({ top: 0, leading: 0, bottom: 4, trailing: 0 }), dynamicTypeSize({ max: 'xxLarge' }), ...chrome]}>
      {days.map((day) => (
        <Day key={day.key} day={day} selected={day.key === selectedKey} onSelect={onSelect} />
      ))}
    </HStack>
  );
}

function Day({ day, selected, onSelect }: { day: DayStripDay; selected: boolean; onSelect: (key: string) => void }) {
  const palette = usePalette();
  const tinted = foregroundStyle(palette.tint);
  let numberStyle = labelText;
  if (selected) numberStyle = foregroundStyle(palette.onTint);
  else if (day.holiday) numberStyle = foregroundStyle(DESTRUCTIVE);
  else if (day.isToday) numberStyle = tinted;

  return (
    <Button
      onPress={() => onSelect(day.key)}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(day.accessibilityLabel),
        ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
      ]}>
      <VStack spacing={2} modifiers={[frame({ maxWidth: Infinity }), contentShape(shapes.rectangle())]}>
        <Image
          systemName="arrowtriangle.down.fill"
          modifiers={[font({ size: 10 }), tinted, frame({ height: 10 }), opacity(day.isToday ? 1 : 0)]}
        />
        <Text
          modifiers={[
            font({ textStyle: 'footnote', weight: day.isToday ? 'semibold' : 'regular' }),
            day.isToday ? tinted : secondaryLabelText,
          ]}>
          {day.weekday}
        </Text>
        <ZStack modifiers={[frame({ width: CIRCLE, height: CIRCLE })]}>
          {selected ? <Circle modifiers={[foregroundStyle(palette.tint)]} /> : null}
          <VStack spacing={0}>
            <Text modifiers={[font({ size: 20, weight: 'semibold' }), monospacedDigit(), numberStyle]}>{day.day}</Text>
            {day.holiday ? (
              <Text modifiers={[font({ size: 10, weight: 'semibold' }), numberStyle]}>{day.holiday}</Text>
            ) : null}
          </VStack>
        </ZStack>
      </VStack>
    </Button>
  );
}
