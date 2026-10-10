import {
  Box,
  Column,
  FlowRow,
  Icon,
  LoadingIndicator,
  OutlinedButton,
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
  combinedClickable,
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
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, ToastAndroid, useWindowDimensions, View } from 'react-native';

import { icons } from '@/components/icons';

import type {
  ChoiceGridProps,
  CrowdBarProps,
  EmbeddedProps,
  EmptyStateProps,
  LoadingProps,
  MetricPillsProps,
  NoticeProps,
  TextBlockProps,
  TileGridProps,
} from '../types';
import { chunk, joinLabel, labelWidth, withAlpha } from './helpers';
import { CARD_RADIUS, iconSource, roundedShape, useContentWidth, useInCard, useM3 } from './theme';

/** Copies `text`, confirming with a toast where the system does not (before Android 13). */
function copyText(text: string) {
  void Clipboard.setStringAsync(text).then((copied) => {
    if (copied && Platform.OS === 'android' && Platform.Version < 33) ToastAndroid.show('已複製', ToastAndroid.SHORT);
  });
}

export function TextBlock({
  text,
  secondary = false,
  size: textSize = 'body',
  brandMark = false,
  selectable = false,
}: TextBlockProps) {
  const m = useM3();
  const inCard = useInCard();
  let typography: 'headlineLarge' | 'headlineSmall' | 'bodyMedium' | 'bodyLarge' = secondary ? 'bodyMedium' : 'bodyLarge';
  if (textSize === 'large') typography = 'headlineSmall';
  if (textSize === 'title') typography = 'headlineLarge';
  const textView = (
    <Text
      color={secondary ? m.onSurfaceVariant : m.onSurface}
      style={{ typography, fontWeight: textSize === 'title' ? '700' : undefined }}
      modifiers={[
        fillMaxWidth(),
        inCard ? padding(16, 12, 16, 12) : padding(16, 0, 16, 0),
        // @expo/ui has no SelectionContainer, so selectable text copies as a
        // whole on long press instead. No ripple: it should still read as text.
        ...(selectable ? [combinedClickable({ onLongClick: () => copyText(text) }, { indication: false })] : []),
      ]}>
      {text}
    </Text>
  );
  if (!(brandMark && textSize === 'title')) return textView;
  return (
    <Column verticalArrangement={{ spacedBy: 20 }} modifiers={[fillMaxWidth(), padding(0, 24, 0, 0)]}>
      {/* The CK 倒三角. */}
      <Text color={m.primary} style={{ fontSize: 56 }} modifiers={[padding(16, 0, 16, 0)]}>
        ▼
      </Text>
      {textView}
    </Column>
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
            <OutlinedButton onClick={action.onPress}>
              <Text style={{ typography: 'labelLarge' }}>{action.label}</Text>
            </OutlinedButton>
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

/**
 * One choice among many as a grid of buttons (the welcome screen's classes):
 * the selected one filled with the primary colour.
 */
export function ChoiceGrid({ options, value, onChange, columns = 5, accessibilityLabel }: ChoiceGridProps) {
  const m = useM3();
  const perRow = Math.max(1, Math.floor(columns));
  return (
    <Column verticalArrangement={{ spacedBy: 10 }} modifiers={[fillMaxWidth()]}>
      {chunk(options, perRow).map((row) => (
        <Row key={row[0].value} horizontalArrangement={{ spacedBy: 10 }} modifiers={[fillMaxWidth()]}>
          {row.map((option) => {
            const selected = option.value === value;
            return (
              <Surface
                key={option.value}
                onClick={() => onChange(option.value)}
                color={selected ? m.primary : m.surfaceContainerHigh}
                contentColor={selected ? m.onPrimary : m.onSurface}
                shape={roundedShape(12)}
                modifiers={[
                  weight(1),
                  // Selection is spoken: these semantics take a description only.
                  semantics({
                    contentDescription: joinLabel([accessibilityLabel ? `${accessibilityLabel} ${option.label}` : option.label, selected ? '已選取' : undefined]),
                  }),
                ]}>
                <Box contentAlignment="center" modifiers={[fillMaxWidth(), heightModifier(48)]}>
                  <Text style={{ typography: 'titleMedium', fontWeight: '600' }}>{option.label}</Text>
                </Box>
              </Surface>
            );
          })}
          {Array.from({ length: perRow - row.length }, (_, index) => (
            <Spacer key={`spacer:${index}`} modifiers={[weight(1)]} />
          ))}
        </Row>
      ))}
    </Column>
  );
}

export function TileGrid({ tiles, columns = 3 }: TileGridProps) {
  const m = useM3();
  const inCard = useInCard();
  const contentWidth = useContentWidth();
  const { fontScale } = useWindowDimensions();
  const perRow = Math.max(1, Math.floor(columns));
  const gap = inCard ? 8 : 12;
  // One step up from the surface the tiles sit on: the section card or the screen.
  const tileColor = inCard ? m.surfaceContainerHigh : m.surfaceContainerLow;
  // Titles may take two lines (選擇障礙小幫手 needs ~98dp; a tile on a 360dp
  // phone has ~80dp). When any title will wrap, every tile reserves both lines
  // so the tiles in a row keep one height.
  const titleWidth = (contentWidth - (inCard ? 24 : 0) - gap * (perRow - 1)) / perRow - 16;
  const titleLines = tiles.some((tile) => labelWidth(tile.title, fontScale) > titleWidth) ? 2 : 1;

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
                <Text
                  maxLines={2}
                  minLines={titleLines}
                  overflow="ellipsis"
                  style={{ typography: 'labelLarge', textAlign: 'center' }}>
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
  const estimatedWidth = useContentWidth();
  // The measured width replaces this estimate after the first layout.
  const [width, setWidth] = useState(estimatedWidth);
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
