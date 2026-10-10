import { Button, HStack, Image, RoundedRectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  listRowInsets,
  minimumScaleFactor,
  monospacedDigit,
  multilineTextAlignment,
  opacity,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, useWindowDimensions } from 'react-native';

import { usePalette } from '@/theme/palette';

import type { TimetableGridCell, TimetableGridColumn, TimetableGridProps } from '../types';
import { DESTRUCTIVE, labelText, secondaryLabelText, useRowChrome } from './chrome';
import { layoutScale, reachesTextSize } from './helpers';

/** A cell's height at the default text size (pt); it grows with the footnote up to the grid's xxxLarge cap. */
const CELL_HEIGHT = 54;
const GAP = 6;
const LABEL_WIDTH = 44;
/** The 倒三角's row at the default text size; it grows with the caption2 glyph. */
const MARKER_HEIGHT = 10;
const RADIUS = 12;
const CELL_FILL = PlatformColor('secondarySystemGroupedBackground');

/**
 * The week on the grouped background: weekday columns (today's under the
 * 倒三角, a day off red and dimmed), period rows labelled with their numeral
 * and start time, and a labelled gap for lunch. One plain-button cell per
 * period, filled in the lesson's colour with the subject's full name (a note
 * marked under it; a free period's note in the plain fill), the period in
 * session ringed in the tint; a 空堂 draws nothing but still takes a tap.
 * Text grows with Dynamic Type up to a size five columns can hold
 * (xxxLarge), and the cells grow with it; the accessibility sizes draw that
 * same grid (課表 lists the week instead).
 */
export function TimetableGrid({ columns, rows, cells, breakAfter, onPress }: TimetableGridProps) {
  const chrome = useRowChrome();
  const { fontScale } = useWindowDimensions();
  // At the xxxLarge cap (so at every accessibility size too) a start time no
  // longer fits the label column, and a date and its 放假 no longer fit side
  // by side in a fifth of a phone's width: rows show their numeral alone and
  // the caption goes under the date.
  const atCap = reachesTextSize(fontScale, 'xxxLarge');
  const scale = layoutScale(fontScale, 'xxxLarge');
  // A fixed 54pt holds two footnote lines over a note mark only at the
  // default size, so the cells (and the row labels, to keep rows level) grow
  // with the text.
  const cellHeight = Math.round(CELL_HEIGHT * scale);
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
          <ColumnHeader key={column.key} column={column} stacked={atCap} scale={scale} />
        ))}
      </HStack>
      {blocks.flatMap(([from, to], blockIndex) => {
        const block = (
          <HStack key={`block-${from}`} spacing={GAP} alignment="top">
            <VStack spacing={GAP} modifiers={[frame({ width: LABEL_WIDTH }), accessibilityHidden(true)]}>
              {rows.slice(from, to).map((row) => (
                <RowLabel key={row.key} row={row} withDetail={!atCap} height={cellHeight} />
              ))}
            </VStack>
            {columns.map((column, columnIndex) => (
              <VStack key={column.key} spacing={GAP} modifiers={[frame({ maxWidth: Infinity })]}>
                {rows.slice(from, to).map((row, offset) => {
                  const rowIndex = from + offset;
                  const cell = cells[rowIndex]?.[columnIndex];
                  if (!cell) return null;
                  return (
                    <Cell
                      key={cell.key}
                      cell={cell}
                      height={cellHeight}
                      dimmed={column.holiday !== undefined}
                      onPress={onPress ? () => onPress(rowIndex, columnIndex) : undefined}
                    />
                  );
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

/** A weekday over its date; `stacked` puts a 放假 caption under the date instead of beside it. */
function ColumnHeader({ column, stacked, scale }: { column: TimetableGridColumn; stacked: boolean; scale: number }) {
  const palette = usePalette();
  const tinted = foregroundStyle(palette.tint);
  const dateStyle = column.holiday ? foregroundStyle(DESTRUCTIVE) : column.highlighted ? tinted : labelText;
  const holiday = column.holiday ? (
    <Text modifiers={[font({ textStyle: 'caption2', weight: 'semibold' }), dateStyle, lineLimit(1), minimumScaleFactor(0.7)]}>
      {column.holiday}
    </Text>
  ) : null;
  // The date is sized before the caption, so the caption shrinks instead of
  // the date truncating when the two share a column.
  const date = column.detail ? (
    <Text modifiers={[font({ textStyle: 'title3', weight: 'semibold' }), monospacedDigit(), dateStyle, layoutPriority(1)]}>
      {column.detail}
    </Text>
  ) : null;
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
        modifiers={[font({ textStyle: 'caption2' }), tinted, frame({ height: MARKER_HEIGHT * scale }), opacity(column.highlighted ? 1 : 0)]}
      />
      <Text modifiers={[font({ textStyle: 'footnote' }), column.highlighted ? tinted : secondaryLabelText]}>{column.label}</Text>
      {date && stacked ? (
        <VStack spacing={0}>
          {date}
          {holiday}
        </VStack>
      ) : date ? (
        <HStack spacing={3} alignment="firstTextBaseline">
          {date}
          {holiday}
        </HStack>
      ) : null}
    </VStack>
  );
}

/** The period's numeral over its start time, as tall as its cells; `withDetail` false leaves the time out. */
function RowLabel({ row, withDetail, height }: { row: TimetableGridProps['rows'][number]; withDetail: boolean; height: number }) {
  const palette = usePalette();
  const style = row.highlighted ? foregroundStyle(palette.tint) : undefined;
  return (
    <VStack spacing={0} modifiers={[frame({ height })]}>
      <Text modifiers={[font({ textStyle: 'headline', weight: 'bold' }), style ?? labelText]}>{row.label}</Text>
      {withDetail && row.detail ? (
        <Text modifiers={[font({ textStyle: 'caption2' }), monospacedDigit(), style ?? secondaryLabelText]}>{row.detail}</Text>
      ) : null}
    </VStack>
  );
}

/** The lunch gap: its label alone, centred under the grid's columns. */
function BreakLabel({ label }: { label: string }) {
  return (
    <Text
      modifiers={[
        font({ textStyle: 'caption' }),
        monospacedDigit(),
        secondaryLabelText,
        lineLimit(2),
        minimumScaleFactor(0.8),
        multilineTextAlignment('center'),
        frame({ maxWidth: Infinity }),
        padding({ leading: LABEL_WIDTH + GAP, vertical: 4 }),
      ]}>
      {label}
    </Text>
  );
}

function Cell({ cell, height, dimmed, onPress }: {
  cell: TimetableGridCell;
  height: number;
  dimmed: boolean;
  onPress?: () => void;
}) {
  const palette = usePalette();
  const ink = dimmed ? secondaryLabelText : cell.ink ? foregroundStyle(cell.ink) : labelText;
  const body = (
    // A plain button hit-tests what its label draws, and a 空堂 draws nothing,
    // so the content shape makes the whole frame tappable. The frame must get
    // its width without the children (an empty stack has no width of its own),
    // and @expo/ui's frame drops maxWidth whenever width or height is set, so
    // the height is pinned through min/max instead.
    <ZStack
      modifiers={[
        frame({ maxWidth: Infinity, minHeight: height, maxHeight: height }),
        contentShape(shapes.rectangle()),
        ...(dimmed ? [opacity(0.5)] : []),
      ]}>
      {cell.empty ? null : <RoundedRectangle cornerRadius={RADIUS} modifiers={[foregroundStyle(cell.color ?? CELL_FILL)]} />}
      {cell.empty ? null : (
        <VStack spacing={1} modifiers={[padding({ horizontal: 3, vertical: 3 })]}>
          <Text
            modifiers={[
              font({ textStyle: 'footnote', weight: 'medium' }),
              ink,
              lineLimit(3),
              minimumScaleFactor(0.75),
              multilineTextAlignment('center'),
            ]}>
            {cell.text}
          </Text>
          {cell.note ? <Image systemName="note.text" modifiers={[font({ textStyle: 'caption2' }), ink, accessibilityHidden(true)]} /> : null}
        </VStack>
      )}
      {cell.current ? (
        // 現在 by shape as well as colour: a ring round the cell, a free one too.
        <RoundedRectangle
          cornerRadius={RADIUS}
          modifiers={[
            foregroundStyle('#00000000'),
            strokeBorder({ content: palette.tint, style: { lineWidth: 2 }, shape: 'roundedRectangle', cornerRadius: RADIUS }),
          ]}
        />
      ) : null}
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
