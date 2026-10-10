import { Button, HStack, Image, Rectangle, RoundedRectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  buttonStyle,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowInsets,
  minimumScaleFactor,
  monospacedDigit,
  multilineTextAlignment,
  opacity,
  padding,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor } from 'react-native';

import { usePalette } from '@/theme/palette';

import type { TimetableGridCell, TimetableGridColumn, TimetableGridProps } from '../types';
import { DESTRUCTIVE, labelText, secondaryLabelText, useRowChrome } from './chrome';

const CELL_HEIGHT = 50;
const GAP = 4;
const LABEL_WIDTH = 44;
const RADIUS = 12;
const CLEAR = '#00000000';
const CELL_FILL = PlatformColor('secondarySystemGroupedBackground');

/**
 * The week on the grouped background: weekday columns (today's under the
 * 倒三角, a day off red and dimmed), period rows labelled with their numeral
 * and start time, and a labelled gap for lunch. Each column is a stack of
 * cells, so a 連堂 is one tall cell (`span`); spans never cross the gap.
 * Cells are plain buttons in the subject's colours, a 空堂 a dashed outline.
 * Text grows with Dynamic Type up to a size five columns can hold.
 */
export function TimetableGrid({ columns, rows, cells, breakAfter, onPress }: TimetableGridProps) {
  const chrome = useRowChrome();
  const blocks: [number, number][] = breakAfter
    ? [
        [0, breakAfter.index + 1],
        [breakAfter.index + 1, rows.length],
      ]
    : [[0, rows.length]];

  return (
    <VStack
      spacing={6}
      modifiers={[
        listRowInsets({ top: 0, leading: 0, bottom: 8, trailing: 0 }),
        dynamicTypeSize({ max: 'xxxLarge' }),
        ...chrome,
      ]}>
      <HStack spacing={GAP} alignment="bottom">
        <Text modifiers={[frame({ width: LABEL_WIDTH }), accessibilityHidden(true)]}>{' '}</Text>
        {columns.map((column) => (
          <ColumnHeader key={column.key} column={column} />
        ))}
      </HStack>
      {blocks.flatMap(([from, to], blockIndex) => {
        const block = (
          <HStack key={`block-${from}`} spacing={GAP} alignment="top">
            <VStack spacing={GAP} modifiers={[frame({ width: LABEL_WIDTH }), accessibilityHidden(true)]}>
              {rows.slice(from, to).map((row) => (
                <RowLabel key={row.key} row={row} />
              ))}
            </VStack>
            {columns.map((column, columnIndex) => (
              <VStack key={column.key} spacing={GAP} modifiers={[frame({ maxWidth: Infinity })]}>
                {rows.slice(from, to).flatMap((row, offset) => {
                  const rowIndex = from + offset;
                  const cell = cells[rowIndex]?.[columnIndex];
                  if (!cell || cell.span === 0) return [];
                  const span = Math.max(1, Math.min(cell.span ?? 1, to - rowIndex));
                  return [
                    <Cell
                      key={cell.key}
                      cell={cell}
                      height={span * CELL_HEIGHT + (span - 1) * GAP}
                      dimmed={column.holiday !== undefined}
                      onPress={onPress ? () => onPress(rowIndex, columnIndex) : undefined}
                    />,
                  ];
                })}
              </VStack>
            ))}
          </HStack>
        );
        return blockIndex > 0 && breakAfter ? [<BreakLabel key="break" label={breakAfter.label} />, block] : [block];
      })}
    </VStack>
  );
}

function ColumnHeader({ column }: { column: TimetableGridColumn }) {
  const palette = usePalette();
  const tinted = foregroundStyle(palette.tint);
  const dateStyle = column.holiday ? foregroundStyle(DESTRUCTIVE) : column.highlighted ? tinted : labelText;
  return (
    <VStack
      spacing={1}
      modifiers={[
        frame({ maxWidth: Infinity }),
        accessibilityElement('ignore'),
        accessibilityLabel(column.accessibilityLabel ?? column.label),
        accessibilityAddTraits(['isHeader']),
      ]}>
      <Image
        systemName="arrowtriangle.down.fill"
        modifiers={[font({ size: 10 }), tinted, frame({ height: 10 }), opacity(column.highlighted ? 1 : 0)]}
      />
      <Text modifiers={[font({ textStyle: 'footnote' }), column.highlighted ? tinted : secondaryLabelText]}>{column.label}</Text>
      {column.detail ? (
        <HStack spacing={3} alignment="firstTextBaseline">
          <Text modifiers={[font({ size: 20, weight: 'semibold' }), monospacedDigit(), dateStyle]}>{column.detail}</Text>
          {column.holiday ? (
            <Text modifiers={[font({ textStyle: 'caption2', weight: 'semibold' }), dateStyle, lineLimit(1), minimumScaleFactor(0.7)]}>
              {column.holiday}
            </Text>
          ) : null}
        </HStack>
      ) : null}
    </VStack>
  );
}

function RowLabel({ row }: { row: TimetableGridProps['rows'][number] }) {
  const palette = usePalette();
  const style = row.highlighted ? foregroundStyle(palette.tint) : undefined;
  return (
    <VStack spacing={0} modifiers={[frame({ height: CELL_HEIGHT })]}>
      <Text modifiers={[font({ textStyle: 'headline', weight: 'bold' }), style ?? labelText]}>{row.label}</Text>
      {row.detail ? (
        <Text modifiers={[font({ textStyle: 'caption2' }), monospacedDigit(), style ?? secondaryLabelText]}>{row.detail}</Text>
      ) : null}
    </VStack>
  );
}

/** The lunch gap: its label between two dotted rules. */
function BreakLabel({ label }: { label: string }) {
  const rule = (
    <Rectangle
      modifiers={[
        foregroundStyle(CLEAR),
        strokeBorder({ content: PlatformColor('separator'), style: { lineWidth: 1, dash: [2, 3] }, shape: 'rectangle' }),
        frame({ maxWidth: Infinity, height: 1 }),
      ]}
    />
  );
  return (
    <HStack spacing={8} modifiers={[padding({ leading: LABEL_WIDTH + GAP, vertical: 2 })]}>
      {rule}
      <Text modifiers={[font({ textStyle: 'caption' }), monospacedDigit(), secondaryLabelText, lineLimit(1)]}>{label}</Text>
      {rule}
    </HStack>
  );
}

function Cell({ cell, height, dimmed, onPress }: {
  cell: TimetableGridCell;
  height: number;
  dimmed: boolean;
  onPress?: () => void;
}) {
  const body = (
    <ZStack modifiers={[frame({ maxWidth: Infinity, height }), ...(dimmed ? [opacity(0.5)] : [])]}>
      {cell.empty ? (
        <RoundedRectangle
          cornerRadius={RADIUS}
          modifiers={[
            foregroundStyle(CLEAR),
            strokeBorder({
              content: PlatformColor('separator'),
              style: { lineWidth: 1.5, dash: [4, 3] },
              shape: 'roundedRectangle',
              cornerRadius: RADIUS,
            }),
          ]}
        />
      ) : (
        <RoundedRectangle cornerRadius={RADIUS} modifiers={[foregroundStyle(cell.color ?? CELL_FILL)]} />
      )}
      <Text
        modifiers={[
          font({ textStyle: 'subheadline', weight: 'medium' }),
          dimmed ? secondaryLabelText : cell.ink ? foregroundStyle(cell.ink) : labelText,
          lineLimit(3),
          minimumScaleFactor(0.7),
          multilineTextAlignment('center'),
          padding({ horizontal: 3, vertical: 4 }),
        ]}>
        {cell.text}
      </Text>
    </ZStack>
  );
  return onPress ? (
    <Button onPress={onPress} modifiers={[buttonStyle('plain'), accessibilityLabel(cell.accessibilityLabel)]}>
      {body}
    </Button>
  ) : (
    <VStack modifiers={[accessibilityElement('ignore'), accessibilityLabel(cell.accessibilityLabel)]}>{body}</VStack>
  );
}
