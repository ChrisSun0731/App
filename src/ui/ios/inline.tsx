// Kit inline elements: small SwiftUI views that only go in `Row.footer`.
// The row reads as one VoiceOver element whose label already includes what
// these say (helpers.footerSpeech), so their own labels only matter if they
// are ever read on their own.
import { Capsule, Circle, HStack, Image, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  background,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import type { CrowdBarProps, MetricPillsProps } from '../types';
import { primaryText } from './chrome';
import { sf, spokenLabel, withAlpha } from './helpers';

/**
 * Small capsules (e.g. 可借 3 / 可還 7): the metric's symbol, or a dot, in
 * its colour on a faint wash of the same colour, with the value in the
 * primary label colour so it stays readable whatever the status colour.
 */
export function MetricPills({ metrics }: MetricPillsProps) {
  return (
    <HStack
      spacing={6}
      modifiers={[
        padding({ top: 2 }),
        accessibilityElement('ignore'),
        accessibilityLabel(spokenLabel(metrics.map((metric) => metric.label))),
      ]}>
      {metrics.map((metric) => {
        const symbol = sf(metric.icon);
        return (
          <HStack
            key={metric.key}
            spacing={4}
            modifiers={[
              padding({ horizontal: 8, vertical: 3 }),
              background(withAlpha(metric.color, 0.16), shapes.capsule()),
              // Pills keep their natural width; the row wraps the subtitle instead.
              fixedSize(),
            ]}>
            {symbol ? (
              <Image
                systemName={symbol}
                modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(metric.color)]}
              />
            ) : (
              <Circle modifiers={[foregroundStyle(metric.color), frame({ width: 7, height: 7 })]} />
            )}
            <Text
              modifiers={[
                font({ textStyle: 'footnote', weight: 'medium' }),
                monospacedDigit(),
                primaryText,
                lineLimit(1),
              ]}>
              {metric.label}
            </Text>
          </HStack>
        );
      })}
    </HStack>
  );
}

/** One capsule per car, front car first, coloured by crowding level. */
export function CrowdBar({ levels, accessibilityLabel: spoken }: CrowdBarProps) {
  return (
    <HStack
      spacing={3}
      modifiers={[padding({ vertical: 3 }), accessibilityElement('ignore'), accessibilityLabel(spoken)]}>
      {levels.map((level) => (
        <Capsule key={level.key} modifiers={[foregroundStyle(level.color), frame({ width: 18, height: 7 })]} />
      ))}
    </HStack>
  );
}
