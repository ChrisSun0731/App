import { Box, Column, Icon, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import {
  alpha,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  semantics,
  Shapes,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { useWindowDimensions } from 'react-native';

import { icons } from '@/components/icons';

import type { TimetableGridCell, TimetableGridColumn, TimetableGridProps } from '../types';
import { iconSource, roundedShape, TRANSPARENT, useM3 } from './theme';

/** A cell's height at the default font scale (dp); it grows with the text. */
const CELL_HEIGHT = 56;
const GAP = 6;
const ROW_HEADER_WIDTH = 40;
const CELL_RADIUS = 12;
const CELL_SHAPE = Shapes.RoundedCorner(CELL_RADIUS);

/**
 * The week on the screen background: weekday columns (today's under the
 * 倒三角, a day off red and dimmed), period rows with their numeral and start
 * time, and a labelled gap for lunch. One clickable cell per period, filled in
 * the lesson's colour with the subject's full name (a note marked under it; a
 * free period's note in the plain fill) and the period in session ringed in
 * primary; a 空堂 draws nothing but still takes a tap. A name longer than three
 * lines (two over a note mark) ends in an ellipsis: on phones narrower than
 * about 405dp from a font scale of 1.15 to 1.3 (課表 lists the week from 1.5).
 */
export function TimetableGrid({ columns, rows, cells, breakAfter, onPress }: TimetableGridProps) {
  const m = useM3();
  // A fixed 56dp holds two bodySmall lines over a note mark only at the
  // default font scale, so the cells (and the row labels, to keep rows level)
  // grow with the text; the default already clears the 48dp touch target, so
  // the small scales keep it.
  const cellHeight = Math.round(CELL_HEIGHT * Math.max(1, useWindowDimensions().fontScale));
  const blocks: [number, number][] = breakAfter
    ? [
        [0, breakAfter.index + 1],
        [breakAfter.index + 1, rows.length],
      ]
    : [[0, rows.length]];

  return (
    <Column verticalArrangement={{ spacedBy: 6 }} modifiers={[fillMaxWidth()]}>
      <Row horizontalArrangement={{ spacedBy: GAP }} modifiers={[fillMaxWidth()]}>
        <Box modifiers={[width(ROW_HEADER_WIDTH)]} />
        {columns.map((column) => (
          <ColumnHeader key={column.key} column={column} />
        ))}
      </Row>
      {blocks.flatMap(([from, to], blockIndex) => {
        const block = (
          <Row key={`block-${from}`} horizontalArrangement={{ spacedBy: GAP }} modifiers={[fillMaxWidth()]}>
            <Column verticalArrangement={{ spacedBy: GAP }} modifiers={[width(ROW_HEADER_WIDTH)]}>
              {rows.slice(from, to).map((row) => (
                <Column key={row.key} horizontalAlignment="center" modifiers={[height(cellHeight)]}>
                  <Text color={row.highlighted ? m.primary : m.onSurface} style={{ typography: 'titleSmall', fontWeight: '700' }}>
                    {row.label}
                  </Text>
                  {row.detail ? (
                    <Text color={row.highlighted ? m.primary : m.onSurfaceVariant} style={{ typography: 'labelSmall' }}>
                      {row.detail}
                    </Text>
                  ) : null}
                </Column>
              ))}
            </Column>
            {columns.map((column, columnIndex) => (
              <Column key={column.key} verticalArrangement={{ spacedBy: GAP }} modifiers={[weight(1)]}>
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
              </Column>
            ))}
          </Row>
        );
        if (blockIndex === 0 || !breakAfter) return [block];
        return [
          <Text
            key="break"
            color={m.onSurfaceVariant}
            style={{ typography: 'labelSmall', textAlign: 'center' }}
            modifiers={[fillMaxWidth(), padding(ROW_HEADER_WIDTH, 4, 0, 4)]}>
            {breakAfter.label}
          </Text>,
          block,
        ];
      })}
    </Column>
  );
}

function ColumnHeader({ column }: { column: TimetableGridColumn }) {
  const m = useM3();
  const dateColor = column.holiday ? m.error : column.highlighted ? m.primary : m.onSurface;
  return (
    <Column
      horizontalAlignment="center"
      modifiers={[weight(1), semantics({ contentDescription: column.accessibilityLabel ?? column.label })]}>
      <Text color={column.highlighted ? m.primary : '#00000000'} style={{ fontSize: 10 }}>
        ▼
      </Text>
      <Text color={column.highlighted ? m.primary : m.onSurfaceVariant} style={{ typography: 'labelMedium' }}>
        {column.label}
      </Text>
      {column.detail ? (
        <Row verticalAlignment="bottom" horizontalArrangement={{ spacedBy: 2 }}>
          <Text color={dateColor} style={{ typography: 'titleMedium', fontWeight: '600' }}>
            {column.detail}
          </Text>
          {column.holiday ? (
            <Text color={dateColor} maxLines={1} style={{ fontSize: 10, fontWeight: '600' }}>
              {column.holiday}
            </Text>
          ) : null}
        </Row>
      ) : null}
    </Column>
  );
}

function Cell({ cell, height: cellHeight, dimmed, onPress }: {
  cell: TimetableGridCell;
  height: number;
  dimmed: boolean;
  onPress?: () => void;
}) {
  const m = useM3();
  const ink = dimmed ? m.onSurfaceVariant : (cell.ink ?? m.onSurface);
  // A Surface, so the 現在 ring follows the rounded corners (a border modifier
  // strokes a rectangle, which the clip would cut at each corner).
  return (
    <Surface
      color={cell.empty ? TRANSPARENT : (cell.color ?? m.surfaceContainerLowest)}
      contentColor={ink}
      shape={roundedShape(CELL_RADIUS)}
      border={cell.current ? { width: 2, color: m.primary } : undefined}
      modifiers={[
        fillMaxWidth(),
        height(cellHeight),
        // The ripple keeps to the shape too.
        clip(CELL_SHAPE),
        ...(dimmed ? [alpha(0.5)] : []),
        ...(onPress ? [clickable(onPress)] : []),
        semantics({ contentDescription: cell.accessibilityLabel }),
      ]}>
      <Box contentAlignment="center" modifiers={[fillMaxSize()]}>
        {cell.empty ? null : (
          <Column horizontalAlignment="center" modifiers={[padding(3, 3, 3, 3)]}>
            {/* With a note mark under it, the name keeps to two lines so the mark keeps its room. */}
            <Text
              color={ink}
              maxLines={cell.note ? 2 : 3}
              overflow="ellipsis"
              style={{ typography: 'bodySmall', textAlign: 'center', fontWeight: '500' }}>
              {cell.text}
            </Text>
            {cell.note ? <Icon source={iconSource(icons.note)} size={12} tint={ink} /> : null}
          </Column>
        )}
      </Box>
    </Surface>
  );
}
