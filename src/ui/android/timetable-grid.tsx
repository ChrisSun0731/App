import { Box, Column, Row, Text } from '@expo/ui/jetpack-compose';
import {
  alpha,
  background,
  border,
  clickable,
  clip,
  fillMaxWidth,
  height,
  padding,
  semantics,
  Shapes,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';

import type { TimetableGridCell, TimetableGridColumn, TimetableGridProps } from '../types';
import { useM3 } from './theme';

const CELL_HEIGHT = 52;
const GAP = 4;
const ROW_HEADER_WIDTH = 40;
const CELL_SHAPE = Shapes.RoundedCorner(12);

/**
 * The week on the screen background: weekday columns (today's under the
 * 倒三角, a day off red and dimmed), period rows with their numeral and start
 * time, and a labelled gap for lunch. Each column is a stack of cells, so a
 * 連堂 is one tall cell (`span`); spans never cross the gap. Cells are
 * clickable, in the subject's colours, a 空堂 outlined.
 */
export function TimetableGrid({ columns, rows, cells, breakAfter, onPress }: TimetableGridProps) {
  const m = useM3();
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
                <Column key={row.key} horizontalAlignment="center" modifiers={[height(CELL_HEIGHT)]}>
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
                {rows.slice(from, to).flatMap((row, offset) => {
                  const rowIndex = from + offset;
                  const cell = cells[rowIndex]?.[columnIndex];
                  if (!cell || cell.span === 0) return [];
                  const span = Math.max(1, Math.min(cell.span ?? 1, to - rowIndex));
                  return [
                    <Cell
                      key={cell.key}
                      cell={cell}
                      cellHeight={span * CELL_HEIGHT + (span - 1) * GAP}
                      dimmed={column.holiday !== undefined}
                      onPress={onPress ? () => onPress(rowIndex, columnIndex) : undefined}
                    />,
                  ];
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
            modifiers={[fillMaxWidth(), padding(ROW_HEADER_WIDTH, 2, 0, 2)]}>
            {`· · · ${breakAfter.label} · · ·`}
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

function Cell({ cell, cellHeight, dimmed, onPress }: {
  cell: TimetableGridCell;
  cellHeight: number;
  dimmed: boolean;
  onPress?: () => void;
}) {
  const m = useM3();
  const modifiers = [
    fillMaxWidth(),
    height(cellHeight),
    clip(CELL_SHAPE),
    ...(cell.empty ? [border(1.5, m.outlineVariant)] : [background(cell.color ?? m.surfaceContainerLowest)]),
    ...(dimmed ? [alpha(0.5)] : []),
    ...(onPress ? [clickable(onPress)] : []),
    semantics({ contentDescription: cell.accessibilityLabel }),
  ];
  return (
    <Box contentAlignment="center" modifiers={modifiers}>
      <Text
        color={dimmed ? m.onSurfaceVariant : (cell.ink ?? m.onSurface)}
        maxLines={3}
        style={{ typography: 'bodyMedium', textAlign: 'center', fontWeight: '500' }}
        modifiers={[padding(2, 0, 2, 0)]}>
        {cell.text}
      </Text>
    </Box>
  );
}
