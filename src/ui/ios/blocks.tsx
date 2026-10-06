import {
  Button,
  ContentUnavailableView,
  Grid,
  HStack,
  Image,
  Label,
  ProgressView,
  RNHostView,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityLabel,
  aspectRatio,
  background,
  buttonBorderShape,
  buttonStyle,
  contentShape,
  controlSize,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
  shapes,
  textSelection,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { Platform, View } from 'react-native';

import { usePalette } from '@/theme/palette';

import { chunk } from '../helpers';
import type {
  EmbeddedProps,
  EmptyStateProps,
  FilterChipsProps,
  LoadingProps,
  NoticeProps,
  TextBlockProps,
  TileGridProps,
} from '../types';
import { NO_INSETS, primaryText, QUIET_FILL, secondaryText, useRowChrome } from './chrome';
import { iosMajorVersion, sf } from './helpers';

/** Body text, or a large bold line (e.g. the help screen's pick). */
export function TextBlock({ text, secondary = false, size = 'body', selectable = false }: TextBlockProps) {
  const chrome = useRowChrome();
  const large = size === 'large';
  return (
    <Text
      modifiers={[
        font({ textStyle: large ? 'title2' : 'body', weight: large ? 'bold' : 'regular' }),
        secondary ? secondaryText : primaryText,
        ...(selectable ? [textSelection(true)] : []),
        ...chrome,
      ]}>
      {text}
    </Text>
  );
}

/** A spinner with its label, read as one element. */
export function Loading({ label }: LoadingProps) {
  const chrome = useRowChrome();
  return (
    <HStack spacing={10} modifiers={[accessibilityElement('combine'), ...chrome]}>
      <Spacer />
      <ProgressView />
      <Text modifiers={[secondaryText]}>{label}</Text>
      <Spacer />
    </HStack>
  );
}

/** A warning or information label with an optional bordered button under it. */
export function Notice({ tone, title, message, action }: NoticeProps) {
  const palette = usePalette();
  const chrome = useRowChrome();
  const error = tone === 'error';
  return (
    <VStack alignment="leading" spacing={10} modifiers={[padding({ vertical: 4 }), ...chrome]}>
      <Label
        modifiers={[accessibilityElement('combine')]}
        icon={
          <Image
            systemName={error ? 'exclamationmark.triangle.fill' : 'info.circle.fill'}
            modifiers={[foregroundStyle(error ? palette.danger : palette.tint)]}
          />
        }>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: 'headline' })]}>{title}</Text>
          {message ? <Text modifiers={[font({ textStyle: 'subheadline' }), secondaryText]}>{message}</Text> : null}
        </VStack>
      </Label>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          modifiers={[buttonStyle('bordered'), controlSize('small')]}
        />
      ) : null}
    </VStack>
  );
}

// ContentUnavailableView is iOS 17+; @expo/ui renders nothing below that.
const HAS_CONTENT_UNAVAILABLE_VIEW = iosMajorVersion(Platform.Version) >= 17;

/** An empty or failed state: symbol, title, description and up to two actions. */
export function EmptyState({ title, description, icon, action, secondaryAction }: EmptyStateProps) {
  const chrome = useRowChrome({ flushInPlain: true });
  const symbol = sf(icon) ?? 'questionmark.circle';
  return (
    <VStack spacing={12} modifiers={[frame({ maxWidth: Infinity }), padding({ vertical: 8 }), ...chrome]}>
      {HAS_CONTENT_UNAVAILABLE_VIEW ? (
        <ContentUnavailableView title={title} systemImage={symbol} description={description} />
      ) : (
        <VStack spacing={8} modifiers={[padding({ vertical: 16, horizontal: 16 }), accessibilityElement('combine')]}>
          <Image systemName={symbol} modifiers={[font({ textStyle: 'largeTitle' }), secondaryText]} />
          <Text modifiers={[font({ textStyle: 'title3', weight: 'bold' }), multilineTextAlignment('center')]}>
            {title}
          </Text>
          {description ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondaryText, multilineTextAlignment('center')]}>
              {description}
            </Text>
          ) : null}
        </VStack>
      )}
      {/* Styled buttons, not list-row buttons: two default-style buttons in
          one List row would both fire on any tap. */}
      {action ? (
        <Button label={action.label} onPress={action.onPress} modifiers={[buttonStyle('borderedProminent')]} />
      ) : null}
      {secondaryAction ? (
        <Button
          label={secondaryAction.label}
          onPress={secondaryAction.onPress}
          modifiers={[buttonStyle('borderless')]}
        />
      ) : null}
    </VStack>
  );
}

/** Capsule toggle buttons in a horizontal scroller; selected ones are filled and checked. */
export function FilterChips({ options, onToggle }: FilterChipsProps) {
  const chrome = useRowChrome({ flushInPlain: true });
  return (
    <ScrollView axes="horizontal" showsIndicators={false} modifiers={chrome}>
      <HStack spacing={8}>
        {options.map((option) => (
          <Button
            key={option.key}
            label={option.label}
            // A checkmark marks selection when the chip has no symbol of its
            // own, so the state is not shown by colour alone.
            systemImage={sf(option.icon) ?? (option.selected ? 'checkmark' : undefined)}
            onPress={() => onToggle(option.key)}
            modifiers={[
              buttonStyle(option.selected ? 'borderedProminent' : 'bordered'),
              buttonBorderShape('capsule'),
              controlSize('small'),
              ...(option.selected ? [accessibilityAddTraits(['isSelected'])] : []),
            ]}
          />
        ))}
      </HStack>
    </ScrollView>
  );
}

const TILE_SHAPE = shapes.roundedRectangle({ cornerRadius: 12, roundedCornerStyle: 'continuous' });

/**
 * Feature tiles in a SwiftUI Grid. Every tile is flexible in both axes, so
 * columns share the width equally and tiles in a row match the tallest one
 * when large text wraps a title.
 */
export function TileGrid({ tiles, columns = 3 }: TileGridProps) {
  const palette = usePalette();
  const chrome = useRowChrome();
  return (
    <Grid horizontalSpacing={10} verticalSpacing={10} modifiers={[padding({ vertical: 6 }), ...chrome]}>
      {chunk(tiles, columns).map((row) => (
        <Grid.Row key={row[0].key}>
          {row.map((tile) => (
            <Button
              key={tile.key}
              onPress={tile.onPress}
              modifiers={[buttonStyle('plain'), accessibilityLabel(tile.title)]}>
              <VStack
                spacing={6}
                modifiers={[
                  padding({ vertical: 12, horizontal: 6 }),
                  frame({ maxWidth: Infinity, maxHeight: Infinity }),
                  background(QUIET_FILL, TILE_SHAPE),
                  contentShape(TILE_SHAPE),
                ]}>
                <Image systemName={sf(tile.icon)} modifiers={[font({ textStyle: 'title2' }), foregroundStyle(palette.tint)]} />
                <Text
                  modifiers={[font({ textStyle: 'footnote', weight: 'medium' }), primaryText, multilineTextAlignment('center')]}>
                  {tile.title}
                </Text>
              </VStack>
            </Button>
          ))}
        </Grid.Row>
      ))}
    </Grid>
  );
}

/**
 * React Native content (a map, an image) inside a row, edge to edge in the
 * card. A fixed `height`, or the row width divided by `aspectRatio`: SwiftUI's
 * aspectRatio modifier derives the height from the width the List proposes.
 */
export function Embedded({ children, height, aspectRatio: ratio }: EmbeddedProps) {
  const chrome = useRowChrome();
  const size: ModifierConfig[] = height != null
    ? [frame({ height })]
    : [frame({ maxWidth: Infinity }), aspectRatio({ ratio: ratio && ratio > 0 ? ratio : 16 / 9, contentMode: 'fit' })];
  return (
    <ZStack modifiers={[...size, ...chrome, NO_INSETS]}>
      {/* RNHostView sizes its single native child to the SwiftUI frame; the
          wrapper (never flattened away) makes the content fill it. */}
      <RNHostView>
        <View collapsable={false} style={{ flex: 1 }}>
          {children}
        </View>
      </RNHostView>
    </ZStack>
  );
}
