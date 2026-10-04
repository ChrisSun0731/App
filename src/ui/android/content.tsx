import {
  Box,
  Column,
  FilledTonalButton,
  FlowRow,
  Icon,
  LoadingIndicator,
  RNHostView,
  Row,
  Spacer,
  Surface,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  height as heightModifier,
  onSizeChanged,
  padding,
  paddingAll,
  semantics,
  Shapes,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { icons } from '@/components/icons';

import type {
  CrowdBarProps,
  EmbeddedProps,
  EmptyStateProps,
  LoadingProps,
  MetricPillsProps,
  NoticeProps,
  TextBlockProps,
  TileGridProps,
} from '../types';
import { chunk, joinLabel, withAlpha } from './helpers';
import { CARD_RADIUS, iconSource, roundedShape, useInCard, useM3 } from './theme';

export function TextBlock({ text, secondary = false, size: textSize = 'body' }: TextBlockProps) {
  const m = useM3();
  const inCard = useInCard();
  // `selectable` has no Compose counterpart in @expo/ui (no SelectionContainer).
  const typography = textSize === 'large' ? 'headlineSmall' : secondary ? 'bodyMedium' : 'bodyLarge';
  return (
    <Text
      color={secondary ? m.onSurfaceVariant : m.onSurface}
      style={{ typography }}
      modifiers={[fillMaxWidth(), inCard ? padding(16, 12, 16, 12) : padding(16, 0, 16, 0)]}>
      {text}
    </Text>
  );
}

export function EmptyState({ title, description, icon, action, secondaryAction }: EmptyStateProps) {
  const m = useM3();
  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: 8 }}
      modifiers={[fillMaxWidth(), padding(24, 32, 24, 32)]}>
      <Icon source={iconSource(icon)} size={48} tint={m.onSurfaceVariant} />
      <Text color={m.onSurface} style={{ typography: 'titleMedium', textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text color={m.onSurfaceVariant} style={{ typography: 'bodyMedium', textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {action || secondaryAction ? (
        <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center" modifiers={[padding(0, 8, 0, 0)]}>
          {action ? (
            <FilledTonalButton onClick={action.onPress}>
              <Text style={{ typography: 'labelLarge' }}>{action.label}</Text>
            </FilledTonalButton>
          ) : null}
          {secondaryAction ? (
            <TextButton onClick={secondaryAction.onPress}>
              <Text style={{ typography: 'labelLarge' }}>{secondaryAction.label}</Text>
            </TextButton>
          ) : null}
        </Row>
      ) : null}
    </Column>
  );
}

export function Notice({ tone, title, message, action }: NoticeProps) {
  const m = useM3();
  const inCard = useInCard();
  const container = tone === 'error' ? m.errorContainer : m.secondaryContainer;
  const content = tone === 'error' ? m.onErrorContainer : m.onSecondaryContainer;
  return (
    // A tonal banner. Inside a section card it fills its slot edge to edge
    // (the card's clip rounds it) instead of nesting a second card.
    <Surface
      color={container}
      contentColor={content}
      shape={inCard ? undefined : roundedShape(CARD_RADIUS)}
      modifiers={[fillMaxWidth()]}>
      <Row
        horizontalArrangement={{ spacedBy: 16 }}
        modifiers={[fillMaxWidth(), padding(16, 16, 16, action ? 4 : 16)]}>
        <Icon source={iconSource(tone === 'error' ? icons.error : icons.info)} size={24} tint={content} />
        <Column verticalArrangement={{ spacedBy: 4 }} modifiers={[weight(1)]}>
          <Text color={content} style={{ typography: 'titleSmall' }}>
            {title}
          </Text>
          {message ? (
            <Text color={content} style={{ typography: 'bodyMedium' }}>
              {message}
            </Text>
          ) : null}
          {action ? (
            <Row horizontalArrangement="end" modifiers={[fillMaxWidth()]}>
              <TextButton onClick={action.onPress} colors={{ contentColor: content }}>
                <Text style={{ typography: 'labelLarge' }}>{action.label}</Text>
              </TextButton>
            </Row>
          ) : null}
        </Column>
      </Row>
    </Surface>
  );
}

export function Loading({ label }: LoadingProps) {
  const m = useM3();
  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: 12 }}
      modifiers={[fillMaxWidth(), padding(16, 24, 16, 24)]}>
      {/* Material 3 Expressive's morphing-shape indicator (the Host uses MaterialExpressiveTheme). */}
      <LoadingIndicator />
      <Text color={m.onSurfaceVariant} style={{ typography: 'bodyMedium', textAlign: 'center' }}>
        {label}
      </Text>
    </Column>
  );
}

export function TileGrid({ tiles, columns = 3 }: TileGridProps) {
  const m = useM3();
  const inCard = useInCard();
  const perRow = Math.max(1, Math.floor(columns));
  const gap = inCard ? 8 : 12;
  // One step up from the surface the tiles sit on: the section card or the screen.
  const tileColor = inCard ? m.surfaceContainerHigh : m.surfaceContainerLow;

  return (
    <Column verticalArrangement={{ spacedBy: gap }} modifiers={[fillMaxWidth(), ...(inCard ? [paddingAll(12)] : [])]}>
      {chunk(tiles, perRow).map((row) => (
        <Row key={row[0].key} horizontalArrangement={{ spacedBy: gap }} modifiers={[fillMaxWidth()]}>
          {row.map((tile) => (
            <Surface
              key={tile.key}
              onClick={tile.onPress}
              color={tileColor}
              contentColor={m.onSurface}
              shape={roundedShape(16)}
              modifiers={[weight(1)]}>
              <Column
                horizontalAlignment="center"
                verticalArrangement={{ spacedBy: 8 }}
                modifiers={[fillMaxWidth(), padding(8, 16, 8, 14)]}>
                <Icon source={iconSource(tile.icon)} size={28} tint={m.primary} />
                <Text maxLines={1} overflow="ellipsis" style={{ typography: 'labelLarge', textAlign: 'center' }}>
                  {tile.title}
                </Text>
              </Column>
            </Surface>
          ))}
          {/* Keep tiles in a short last row the same width as the rest. */}
          {Array.from({ length: perRow - row.length }, (_, index) => (
            <Spacer key={`spacer:${index}`} modifiers={[weight(1)]} />
          ))}
        </Row>
      ))}
    </Column>
  );
}

/** Height of an Embedded view given neither `height` nor `aspectRatio`. */
const DEFAULT_EMBEDDED_HEIGHT = 240;

export function Embedded({ children, height, aspectRatio }: EmbeddedProps) {
  const inCard = useInCard();
  const { width: windowWidth } = useWindowDimensions();
  // Rows span the window minus the 16dp list gutters; the measured width
  // replaces this estimate after the first layout.
  const [width, setWidth] = useState(windowWidth - 32);
  const resolvedHeight =
    height ?? (aspectRatio && aspectRatio > 0 ? Math.round(width / aspectRatio) : DEFAULT_EMBEDDED_HEIGHT);

  const modifiers = [
    fillMaxWidth(),
    heightModifier(resolvedHeight),
    // In a card the card's clip rounds the corners; on its own it rounds itself.
    ...(inCard ? [] : [clip(Shapes.RoundedCorner(CARD_RADIUS))]),
    ...(height == null && aspectRatio
      ? [
          onSizeChanged((measured) => {
            if (Math.abs(measured.width - width) > 0.5) setWidth(measured.width);
          }),
        ]
      : []),
  ];

  return (
    <Box modifiers={modifiers}>
      <RNHostView modifiers={[fillMaxSize()]}>
        {/* RNHostView sizes its one child to the Compose box; the flex view
            gives maps and images a sized parent to fill. */}
        <View style={{ flex: 1 }}>{children}</View>
      </RNHostView>
    </Box>
  );
}

export function MetricPills({ metrics }: MetricPillsProps) {
  const m = useM3();
  return (
    <FlowRow
      horizontalArrangement={{ spacedBy: 6 }}
      verticalArrangement={{ spacedBy: 6 }}
      // The row reads as one element with an explicit description, which
      // replaces merged texts, so the pills describe themselves too.
      modifiers={[semantics({ contentDescription: joinLabel(metrics.map((metric) => metric.label)) })]}>
      {metrics.map((metric) => (
        <Row
          key={metric.key}
          verticalAlignment="center"
          horizontalArrangement={{ spacedBy: 6 }}
          modifiers={[clip(Shapes.RoundedCorner(8)), background(withAlpha(metric.color, 0.14)), padding(8, 4, 10, 4)]}>
          {metric.icon ? (
            <Icon source={iconSource(metric.icon)} size={16} tint={metric.color} />
          ) : (
            <Box modifiers={[size(8, 8), clip(Shapes.Circle), background(metric.color)]} />
          )}
          <Text color={m.onSurface} maxLines={1} style={{ typography: 'labelMedium' }}>
            {metric.label}
          </Text>
        </Row>
      ))}
    </FlowRow>
  );
}

export function CrowdBar({ levels, accessibilityLabel }: CrowdBarProps) {
  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: 3 }}
      modifiers={[padding(0, 2, 0, 2), semantics({ contentDescription: accessibilityLabel })]}>
      {levels.map((level) => (
        <Box key={level.key} modifiers={[size(18, 8), clip(Shapes.RoundedCorner(4)), background(level.color)]} />
      ))}
    </Row>
  );
}
