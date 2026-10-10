import { Box, Card, Column, Row, Text } from '@expo/ui/jetpack-compose';
import {
  align,
  background,
  border,
  clickable,
  clip,
  fillMaxWidth,
  height,
  padding,
  semantics,
  Shapes,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useColorScheme } from 'react-native';

import { NOW_CARD, NOW_RAIL_AHEAD, ON_NOW_CARD, ON_NOW_CARD_SOFT } from '@/theme/brand';

import type { NowCardProps, NowRail } from '../types';

const BAR_HEIGHT = 6;
const BAR_SHAPE = Shapes.RoundedCorner(BAR_HEIGHT / 2);
/** Compose rejects a zero weight; parts this small still lay out as nothing visible. */
const MIN_WEIGHT = 0.001;

/**
 * The 現在 card: a CK-navy Material card with the eyebrow line, the title,
 * the bell rail, the footer line and label / value details. Tappable cards
 * merge into one TalkBack node whose description is `accessibilityLabel`.
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
  accessibilityLabel,
  onPress,
}: NowCardProps) {
  const fill = useColorScheme() === 'dark' ? NOW_CARD.dark : NOW_CARD.light;
  return (
    <Card
      colors={{ containerColor: fill, contentColor: ON_NOW_CARD }}
      modifiers={[
        fillMaxWidth(),
        semantics({ contentDescription: accessibilityLabel }),
        ...(onPress ? [clickable(onPress)] : []),
      ]}>
      <Column verticalArrangement={{ spacedBy: 2 }} modifiers={[fillMaxWidth(), padding(20, 18, 20, details?.length ? 4 : 16)]}>
        <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
          <Text color={ON_NOW_CARD} style={{ typography: 'titleMedium', fontWeight: '600' }} modifiers={[weight(1)]}>
            {eyebrow}
          </Text>
          {eyebrowDetail ? (
            <Text color={ON_NOW_CARD_SOFT} style={{ typography: 'bodyMedium' }}>
              {eyebrowDetail}
            </Text>
          ) : null}
        </Row>
        <Text color={ON_NOW_CARD} style={{ typography: 'headlineLarge', fontWeight: '700' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text color={ON_NOW_CARD_SOFT} style={{ typography: 'bodyLarge' }}>
            {subtitle}
          </Text>
        ) : null}
        {rail ? <Rail rail={rail} /> : null}
        {footer || footerDetail ? (
          <Row verticalAlignment="center" modifiers={[fillMaxWidth(), padding(0, rail ? 10 : 8, 0, 0)]}>
            <Text color={ON_NOW_CARD} style={{ typography: 'bodyMedium', fontWeight: '600' }} modifiers={[weight(1)]}>
              {footer ?? ''}
            </Text>
            {footerDetail ? (
              <Text color={ON_NOW_CARD_SOFT} style={{ typography: 'bodyMedium' }}>
                {footerDetail}
              </Text>
            ) : null}
          </Row>
        ) : null}
        {details?.length ? (
          <Column modifiers={[fillMaxWidth(), padding(0, 10, 0, 0)]}>
            {details.map((detail) => (
              <Column key={detail.key} modifiers={[fillMaxWidth()]}>
                <Box modifiers={[fillMaxWidth(), height(1), background('#FFFFFF38')]} />
                <Row verticalAlignment="center" modifiers={[fillMaxWidth(), padding(0, 12, 0, 12)]}>
                  <Text color={ON_NOW_CARD_SOFT} style={{ typography: 'bodyMedium' }} modifiers={[weight(1)]}>
                    {detail.label}
                  </Text>
                  <Text color={ON_NOW_CARD} style={{ typography: 'bodyMedium', fontWeight: '600' }}>
                    {detail.value}
                  </Text>
                </Row>
              </Column>
            ))}
          </Column>
        ) : null}
      </Column>
    </Card>
  );
}

/** A part of the rail in order: a segment, or the break before it. */
type RailPart = { key: string; minutes: number; segment?: NowRail['segments'][number] };

function railParts(rail: NowRail): RailPart[] {
  const parts: RailPart[] = [];
  let cursor = rail.start;
  for (const segment of rail.segments) {
    if (segment.start > cursor) parts.push({ key: `gap-${segment.key}`, minutes: segment.start - cursor });
    parts.push({ key: segment.key, minutes: Math.max(1, segment.end - segment.start), segment });
    cursor = Math.max(cursor, segment.end);
  }
  return parts;
}

/**
 * The bell rail with each part weighted by its minutes: periods are bars that
 * fill as they pass (空堂 an outline), breaks are gaps, lunch a thin line, and
 * the ▼ marks now. The card's description already says all of this.
 */
function Rail({ rail }: { rail: NowRail }) {
  const parts = railParts(rail);
  const span = Math.max(1, rail.end - rail.start);
  const nowFraction = rail.now === null ? null : Math.min(1, Math.max(0, (rail.now - rail.start) / span));

  return (
    <Column modifiers={[fillMaxWidth(), padding(0, 14, 0, 0)]}>
      <Row modifiers={[fillMaxWidth(), height(10)]}>
        {nowFraction !== null ? (
          <>
            <Box modifiers={[weight(Math.max(MIN_WEIGHT, nowFraction))]} />
            <Text color={ON_NOW_CARD} style={{ fontSize: 9, textAlign: 'center' }} modifiers={[size(12, 10)]}>
              ▼
            </Text>
            <Box modifiers={[weight(Math.max(MIN_WEIGHT, 1 - nowFraction))]} />
          </>
        ) : null}
      </Row>
      <Row verticalAlignment="center" modifiers={[fillMaxWidth(), height(BAR_HEIGHT), padding(0, 0, 0, 0)]}>
        {parts.map((part) => (
          <Box key={part.key} modifiers={[weight(part.minutes), height(BAR_HEIGHT)]}>
            {part.segment ? <Bar segment={part.segment} /> : null}
          </Box>
        ))}
      </Row>
      <Row modifiers={[fillMaxWidth(), padding(0, 4, 0, 0)]}>
        {parts.map((part) => (
          <Text
            key={part.key}
            color={part.segment?.current ? ON_NOW_CARD : ON_NOW_CARD_SOFT}
            maxLines={1}
            style={{ typography: 'labelSmall', textAlign: 'center', fontWeight: part.segment?.current ? '700' : undefined }}
            modifiers={[weight(part.minutes)]}>
            {part.segment?.label ?? ''}
          </Text>
        ))}
      </Row>
    </Column>
  );
}

function Bar({ segment }: { segment: NowRail['segments'][number] }): ReactElement {
  if (segment.kind === 'lunch') {
    return (
      <Box
        modifiers={[
          fillMaxWidth(),
          height(1),
          align('center'),
          background(segment.progress >= 1 ? ON_NOW_CARD : NOW_RAIL_AHEAD),
        ]}
      />
    );
  }
  if (segment.kind === 'free') {
    return (
      <Box
        modifiers={[
          fillMaxWidth(),
          height(BAR_HEIGHT),
          clip(BAR_SHAPE),
          border(1, segment.progress >= 1 ? ON_NOW_CARD : NOW_RAIL_AHEAD),
        ]}
      />
    );
  }
  const passed = Math.min(1, Math.max(0, segment.progress));
  return (
    <Row modifiers={[fillMaxWidth(), height(BAR_HEIGHT), clip(BAR_SHAPE), background(NOW_RAIL_AHEAD)]}>
      {passed > 0 ? <Box modifiers={[weight(Math.max(MIN_WEIGHT, passed)), height(BAR_HEIGHT), background(ON_NOW_CARD)]} /> : null}
      {passed < 1 ? <Box modifiers={[weight(Math.max(MIN_WEIGHT, 1 - passed)), height(BAR_HEIGHT)]} /> : null}
    </Row>
  );
}
