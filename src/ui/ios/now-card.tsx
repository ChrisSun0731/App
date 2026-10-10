import { Button, Capsule, Circle, HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  multilineTextAlignment,
  offset,
  onGeometryChange,
  padding,
  strokeBorder,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';

import { NOW_CARD, NOW_RAIL_AHEAD, ON_NOW_CARD, ON_NOW_CARD_SOFT } from '@/theme/brand';

import type { NowCardProps, NowRail } from '../types';
import { useRowChrome } from './chrome';
import { isAccessibilityTextSize, layoutScale } from './helpers';

const WHITE = foregroundStyle(ON_NOW_CARD);
const SOFT = foregroundStyle(ON_NOW_CARD_SOFT);

/**
 * Rail geometry at the default text size (pt): the 倒三角 on top, bars under
 * it, labels under the bars. All but the bars' thickness grows with the text
 * (see Rail).
 */
const MARKER_WIDTH = 12;
const MARKER_HEIGHT = 8;
const BAR_TOP = 12;
const BAR_HEIGHT = 6;
const LABEL_TOP = 22;
const LABEL_HEIGHT = 16;
const LABEL_MIN_WIDTH = 14;

/**
 * The 現在 card as a List row on the CK navy: the eyebrow line, the title,
 * the bell rail and the footer line, then label / value details. One
 * accessibility element (a button when tappable) that reads
 * `accessibilityLabel`; the rail is drawn for sight only.
 */
export function NowCard({
  eyebrow,
  eyebrowDetail,
  title,
  subtitle,
  rail,
  footer,
  footerDetail,
  details,
  accessibilityLabel: spoken,
  onPress,
}: NowCardProps) {
  const fill = useColorScheme() === 'dark' ? NOW_CARD.dark : NOW_CARD.light;
  const chrome = useRowChrome({ background: fill });
  const { fontScale } = useWindowDimensions();
  // At the accessibility text sizes, lines stack and the rail drops its labels.
  const stacked = isAccessibilityTextSize(fontScale);
  // The rail's marker and offsets grow with the text up to xxxLarge; past
  // that the card has stacked and the rail, its labels gone, keeps that size.
  const railScale = layoutScale(fontScale, 'xxxLarge');

  const content = (extra: ModifierConfig[]) => (
    <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), padding({ vertical: 8 }), ...extra]}>
      <Pair
        stacked={stacked}
        leading={<Text modifiers={[font({ textStyle: 'headline' }), WHITE]}>{eyebrow}</Text>}
        trailing={eyebrowDetail ? <Text modifiers={[font({ textStyle: 'subheadline' }), monospacedDigit(), SOFT]}>{eyebrowDetail}</Text> : null}
      />
      <Text modifiers={[font({ textStyle: 'largeTitle', weight: 'bold' }), WHITE, lineLimit(2), minimumScaleFactor(0.7)]}>{title}</Text>
      {subtitle ? <Text modifiers={[font({ textStyle: 'callout' }), SOFT]}>{subtitle}</Text> : null}
      {rail ? <Rail rail={rail} labels={!stacked} scale={railScale} /> : null}
      {footer || footerDetail ? (
        <Pair
          stacked={stacked}
          leading={footer ? <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), monospacedDigit(), WHITE]}>{footer}</Text> : null}
          trailing={footerDetail ? <Text modifiers={[font({ textStyle: 'subheadline' }), monospacedDigit(), SOFT]}>{footerDetail}</Text> : null}
          top={rail ? 10 : 8}
        />
      ) : null}
      {details?.length ? (
        <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 10 })]}>
          {details.map((detail) => (
            <VStack key={detail.key} alignment="leading" spacing={0}>
              <Rectangle modifiers={[frame({ height: 0.5 }), foregroundStyle('#FFFFFF38')]} />
              <Pair
                stacked={stacked}
                leading={<Text modifiers={[font({ textStyle: 'subheadline' }), SOFT]}>{detail.label}</Text>}
                trailing={<Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), monospacedDigit(), WHITE]}>{detail.value}</Text>}
                top={10}
                bottom={10}
              />
            </VStack>
          ))}
        </VStack>
      ) : null}
    </VStack>
  );

  const a11y = accessibilityLabel(spoken);
  return onPress ? (
    <Button onPress={onPress} modifiers={[a11y, ...chrome]}>
      {content([])}
    </Button>
  ) : (
    content([accessibilityElement('ignore'), a11y, ...chrome])
  );
}

/** Two texts on one line (leading, trailing), or stacked at the accessibility text sizes. */
function Pair({ leading, trailing, stacked, top = 0, bottom = 0 }: {
  leading: ReactNode;
  trailing: ReactNode;
  stacked: boolean;
  top?: number;
  bottom?: number;
}) {
  const spacing = padding({ top, bottom });
  return stacked ? (
    <VStack alignment="leading" spacing={2} modifiers={[spacing]}>
      {leading}
      {trailing}
    </VStack>
  ) : (
    <HStack alignment="firstTextBaseline" spacing={8} modifiers={[spacing]}>
      {leading}
      <Spacer minLength={8} />
      {trailing}
    </HStack>
  );
}

/**
 * The bell rail. It measures its own width (onGeometryChange) and places each
 * part at its real time: a period's bar is as long as the period, a break
 * leaves a gap, lunch is a dotted line. `scale` grows the marker's frame and
 * the offsets with the text, and the marker's own Dynamic Type is capped to
 * match, so it never outgrows its frame into the bars. Hidden from VoiceOver.
 */
function Rail({ rail, labels, scale }: { rail: NowRail; labels: boolean; scale: number }) {
  const [width, setWidth] = useState(0);
  const height = labels ? (LABEL_TOP + LABEL_HEIGHT) * scale : BAR_TOP * scale + BAR_HEIGHT;
  return (
    <ZStack
      alignment="topLeading"
      modifiers={[frame({ maxWidth: Infinity, height, alignment: 'topLeading' }), padding({ top: 14 }), accessibilityHidden(true)]}>
      {/* A clear full-width layer to measure: an empty stack has no width of its own. */}
      <Rectangle
        modifiers={[
          foregroundStyle('#FFFFFF00'),
          frame({ maxWidth: Infinity, height }),
          onGeometryChange(({ width: next }) => setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next))),
        ]}
      />
      {width > 0 ? railMarks(rail, width, labels, scale) : null}
    </ZStack>
  );
}

function railMarks(rail: NowRail, width: number, labels: boolean, scale: number) {
  const span = Math.max(1, rail.end - rail.start);
  const x = (minutes: number) => ((minutes - rail.start) / span) * width;
  const barTop = BAR_TOP * scale;
  const marks: ReactElement[] = [];

  for (const segment of rail.segments) {
    const left = x(segment.start);
    const length = Math.max(2, x(segment.end) - left);
    if (segment.kind === 'lunch') {
      // Three dots across the lunch break.
      for (const step of [0.2, 0.5, 0.8]) {
        marks.push(
          <Circle
            key={`${segment.key}-${step}`}
            modifiers={[
              frame({ width: 3, height: 3 }),
              foregroundStyle(segment.progress >= step ? ON_NOW_CARD : NOW_RAIL_AHEAD),
              offset({ x: left + length * step - 1.5, y: barTop + (BAR_HEIGHT - 3) / 2 }),
            ]}
          />,
        );
      }
    } else if (segment.kind === 'free') {
      marks.push(
        <Capsule
          key={segment.key}
          modifiers={[
            // A clear fill: a shape otherwise fills with the row button's tint.
            foregroundStyle('#FFFFFF00'),
            strokeBorder({ content: segment.progress >= 1 ? ON_NOW_CARD : NOW_RAIL_AHEAD, style: { lineWidth: 1 }, shape: 'capsule' }),
            frame({ width: length, height: BAR_HEIGHT }),
            offset({ x: left, y: barTop }),
          ]}
        />,
      );
    } else {
      marks.push(
        <Capsule
          key={segment.key}
          modifiers={[foregroundStyle(NOW_RAIL_AHEAD), frame({ width: length, height: BAR_HEIGHT }), offset({ x: left, y: barTop })]}
        />,
      );
      if (segment.progress > 0) {
        marks.push(
          <Capsule
            key={`${segment.key}-passed`}
            modifiers={[
              foregroundStyle(ON_NOW_CARD),
              frame({ width: Math.max(BAR_HEIGHT, length * segment.progress), height: BAR_HEIGHT }),
              offset({ x: left, y: barTop }),
            ]}
          />,
        );
      }
    }
    if (labels) {
      const labelWidth = Math.max(length, LABEL_MIN_WIDTH * scale);
      marks.push(
        <Text
          key={`${segment.key}-label`}
          modifiers={[
            font({ textStyle: 'caption', weight: segment.current ? 'bold' : 'regular' }),
            segment.current ? WHITE : SOFT,
            lineLimit(1),
            multilineTextAlignment('center'),
            frame({ width: labelWidth }),
            offset({ x: left + (length - labelWidth) / 2, y: LABEL_TOP * scale }),
          ]}>
          {segment.label}
        </Text>,
      );
    }
  }

  if (rail.now !== null) {
    const markerWidth = MARKER_WIDTH * scale;
    marks.push(
      <Image
        key="now"
        systemName="arrowtriangle.down.fill"
        modifiers={[
          font({ textStyle: 'caption2' }),
          dynamicTypeSize({ max: 'xxxLarge' }),
          WHITE,
          frame({ width: markerWidth, height: MARKER_HEIGHT * scale }),
          offset({ x: x(rail.now) - markerWidth / 2, y: 0 }),
        ]}
      />,
    );
  }
  return marks;
}
