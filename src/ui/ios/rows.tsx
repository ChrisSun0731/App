import {
  Button,
  Circle,
  ContextMenu,
  HStack,
  Image,
  Label,
  RoundedRectangle,
  Spacer,
  SwipeActions,
  Text,
  Toggle,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityLabel,
  accessibilityValue,
  background,
  buttonStyle,
  contentShape,
  controlSize,
  disabled as disabledModifier,
  dynamicTypeSize,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  shapes,
  strokeBorder,
  tint,
  type AccessibilityTrait,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { Children, type ReactElement, type ReactNode } from 'react';
import { PlatformColor } from 'react-native';

import { usePalette } from '@/theme/palette';

import type {
  ButtonRowProps,
  CheckRowProps,
  HexColor,
  IconValue,
  RowAccessory,
  RowAction,
  RowMark,
  RowProps,
  RowToggle,
  ToggleRowProps,
} from '../types';
import {
  DESTRUCTIVE,
  labelText,
  NEUTRAL,
  primaryText,
  QUIET_FILL,
  secondaryLabelText,
  secondaryText,
  tertiaryLabelText,
  tertiaryText,
  useIsPlainSection,
  useRowChrome,
} from './chrome';
import { footerSpeech, sf, spokenLabel, trailingSwipeActions } from './helpers';

const FULL_ROW = contentShape(shapes.rectangle());
const SWITCH_ON = PlatformColor('systemGreen');
/** Extra tappable margin around CheckRow's circle (see CheckRow). */
const CHECK_SLOP = 10;

/**
 * A list row: leading symbol or dot, overline / title / subtitle / footer,
 * trailing detail, active-toggle symbol and accessory. Tappable rows are
 * default-style List buttons (the whole row highlights while pressed, like
 * Settings); `actions` and `toggle` become swipe actions plus a long-press
 * context menu, which a disabled row keeps (only its own tap is off).
 */
export function Row({
  title,
  subtitle,
  overline,
  detail,
  icon,
  iconColor,
  dotColor,
  dotShape = 'dot',
  mark,
  titleAside,
  subtitleDotColor,
  note,
  tags,
  strong = false,
  detailProminent = false,
  background: rowBackground,
  badge,
  emphasized = false,
  titleLines = 2,
  accessory = 'none',
  onPress,
  actions,
  toggle,
  footer,
  accessibilityLabel: spokenOverride,
  disabled = false,
}: RowProps) {
  const palette = usePalette();
  const chrome = useRowChrome({ background: rowBackground });
  // `.disabled` goes on the row's button only. The swipe actions and context
  // menu are attached outside it, so they stay available on a disabled row,
  // as the contract asks.
  const hasMenus = (actions?.length ?? 0) > 0 || toggle !== undefined;

  const spoken =
    spokenOverride ??
    spokenLabel([...(tags ?? []), title, titleAside, overline, subtitle, note, ...footerSpeech(footer), detail, badge]);
  const traits: AccessibilityTrait[] = [];
  // State is spoken, not only drawn: a checkmark accessory, or an active
  // toggle (favourite, pinned) whose only visible sign is a trailing symbol.
  if (accessory === 'checkmark' || toggle?.active) traits.push('isSelected');
  if (accessory === 'external') traits.push('isLink');
  const a11y: ModifierConfig[] = [accessibilityLabel(spoken)];
  if (traits.length) a11y.push(accessibilityAddTraits(traits));

  // Fixed label colours: the default List button style would tint
  // hierarchical ones (see chrome.labelText).
  const tinted = foregroundStyle(palette.tint);
  const titleStyle = disabled ? tertiaryLabelText : emphasized ? tinted : labelText;
  const detailStyle = disabled ? tertiaryLabelText : secondaryLabelText;
  const subtitleStyle = emphasized && !disabled ? tinted : detailStyle;
  const toggleButton = toggle?.button === true;

  const content = (extra: ModifierConfig[]) => (
    <HStack spacing={12} modifiers={[FULL_ROW, ...extra]}>
      <RowLeading icon={icon} iconColor={iconColor} dotColor={dotColor} dotShape={dotShape} mark={mark} dimmed={disabled} />
      <VStack alignment="leading" spacing={2} modifiers={[layoutPriority(1)]}>
        {tags?.length ? (
          <HStack spacing={4} modifiers={[padding({ bottom: 2 })]}>
            {tags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </HStack>
        ) : null}
        {overline ? (
          <Text modifiers={[font({ textStyle: 'caption' }), detailStyle, monospacedDigit()]}>{overline}</Text>
        ) : null}
        <HStack spacing={6} alignment="firstTextBaseline">
          <Text
            modifiers={[
              font({ textStyle: 'body', weight: strong ? 'bold' : emphasized ? 'semibold' : 'regular' }),
              titleStyle,
              lineLimit(titleLines),
            ]}>
            {title}
          </Text>
          {titleAside ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), detailStyle, lineLimit(1)]}>{titleAside}</Text>
          ) : null}
          {badge ? <Badge text={badge} /> : null}
        </HStack>
        {subtitle ? (
          <HStack spacing={6} alignment="center">
            {subtitleDotColor ? (
              <Circle modifiers={[foregroundStyle(subtitleDotColor), frame({ width: 8, height: 8 })]} />
            ) : null}
            <Text modifiers={[font({ textStyle: 'subheadline' }), subtitleStyle, monospacedDigit()]}>{subtitle}</Text>
          </HStack>
        ) : null}
        {note ? <Text modifiers={[font({ textStyle: 'subheadline' }), detailStyle]}>{note}</Text> : null}
        {footerContent(footer, detailStyle)}
      </VStack>
      <Spacer minLength={8} />
      {detail ? (
        <Text
          modifiers={[
            detailProminent ? font({ textStyle: 'body', weight: 'semibold' }) : font({ textStyle: 'subheadline' }),
            detailProminent && !disabled ? labelText : detailStyle,
            monospacedDigit(),
            multilineTextAlignment('trailing'),
          ]}>
          {detail}
        </Text>
      ) : null}
      {toggle?.active && !toggleButton ? (
        <Image
          systemName={sf(toggle.activeIcon)}
          modifiers={[font({ textStyle: 'footnote' }), foregroundStyle(toggle.activeColor ?? palette.tint)]}
        />
      ) : null}
      <Accessory kind={accessory} />
    </HStack>
  );

  // The row's own view: a default-style button, which SwiftUI's List turns
  // into a whole-row tap target with the grey selection highlight (the only
  // button in the row, so nothing else fires with it), or one static
  // accessibility element.
  const rootChrome = hasMenus ? [] : chrome;
  let main = onPress ? (
    <Button
      onPress={onPress}
      modifiers={[
        // Beside the toggle's own button, plain: SwiftUI's List fires every
        // default-style button in a row on any tap.
        ...(toggleButton ? [buttonStyle('plain')] : []),
        disabledModifier(disabled),
        ...a11y,
        ...(toggleButton ? [] : rootChrome),
      ]}>
      {content([])}
    </Button>
  ) : (
    content([accessibilityElement('ignore'), ...a11y, ...(toggleButton ? [] : rootChrome)])
  );
  if (toggle && toggleButton) {
    main = (
      <HStack spacing={8} modifiers={rootChrome}>
        {main}
        <ToggleButton toggle={toggle} />
      </HStack>
    );
  }

  if (!hasMenus) return main;
  return (
    <RowMenus chrome={chrome} actions={actions} toggle={toggle} fullSwipe={!disabled}>
      {main}
    </RowMenus>
  );
}

/**
 * Reminders-style row: a circle / checkmark.circle.fill button toggles the
 * check; the rest of the row is a separate button for `onPress`. Both use the
 * plain style so SwiftUI's List does not merge them into one row tap.
 */
export function CheckRow({ title, subtitle, checked, onCheckedChange, onPress, actions }: CheckRowProps) {
  const palette = usePalette();
  const chrome = useRowChrome();
  const hasMenus = (actions?.length ?? 0) > 0;

  const check = (
    <Button
      onPress={() => onCheckedChange(!checked)}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(title),
        accessibilityValue(checked ? '已完成' : '未完成'),
        // isToggle needs iOS 17 and is ignored before it; the value still says the state.
        accessibilityAddTraits(['isToggle']),
      ]}>
      <Image
        systemName={checked ? 'checkmark.circle.fill' : 'circle'}
        modifiers={[
          font({ textStyle: 'title2', weight: 'light' }),
          checked ? foregroundStyle(palette.tint) : tertiaryText,
          // A 44pt hit area around the ~24pt circle without moving it: the
          // padded rectangle takes the taps and the negative padding gives
          // the space back to the layout. The extra 10pt fits in the row's
          // leading inset and the 12pt gap before the body button.
          padding({ all: CHECK_SLOP }),
          FULL_ROW,
          padding({ all: -CHECK_SLOP }),
        ]}
      />
    </Button>
  );

  const text = (
    <HStack modifiers={[FULL_ROW]}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ textStyle: 'body' }), checked ? secondaryText : primaryText, lineLimit(3)]}>
          {title}
        </Text>
        {subtitle ? <Text modifiers={[font({ textStyle: 'subheadline' }), secondaryText]}>{subtitle}</Text> : null}
      </VStack>
      <Spacer minLength={0} />
    </HStack>
  );
  const spoken = accessibilityLabel(spokenLabel([title, subtitle]));
  const body = onPress ? (
    <Button onPress={onPress} modifiers={[buttonStyle('plain'), spoken]}>
      {text}
    </Button>
  ) : (
    <HStack modifiers={[accessibilityElement('ignore'), spoken]}>{text}</HStack>
  );

  const main = (
    // Baseline-aligned like Reminders: the circle stays on the first line of
    // a title that wraps.
    <HStack spacing={12} alignment="firstTextBaseline" modifiers={hasMenus ? [] : chrome}>
      {check}
      {body}
    </HStack>
  );
  if (!hasMenus) return main;
  return (
    <RowMenus chrome={chrome} actions={actions}>
      {main}
    </RowMenus>
  );
}

/**
 * A labelled switch; secondary actions live in its context menu, which stays
 * available while the switch is disabled (e.g. 上移/下移 at the tab limit).
 */
export function ToggleRow({ label, subtitle, icon, value, onValueChange, disabled = false, actions }: ToggleRowProps) {
  const chrome = useRowChrome();
  const symbol = sf(icon);
  const hasMenu = (actions?.length ?? 0) > 0;
  // `.disabled` on the Toggle only: the context menu is attached outside it,
  // so it still opens. Switches stay the system green, as in Settings; the
  // navy tint is for selection and links.
  const modifiers = [tint(SWITCH_ON), disabledModifier(disabled), ...(hasMenu ? [] : chrome)];

  let control: ReactElement;
  if (subtitle) {
    const text = (
      <VStack alignment="leading" spacing={2}>
        <Text>{label}</Text>
        <Text modifiers={[font({ textStyle: 'footnote' }), secondaryText]}>{subtitle}</Text>
      </VStack>
    );
    control = (
      <Toggle isOn={value} onIsOnChange={onValueChange} modifiers={modifiers}>
        {symbol ? <Label systemImage={symbol}>{text}</Label> : text}
      </Toggle>
    );
  } else {
    control = (
      <Toggle isOn={value} onIsOnChange={onValueChange} label={label} systemImage={symbol} modifiers={modifiers} />
    );
  }

  if (!hasMenu) return control;
  return (
    <ContextMenu modifiers={chrome}>
      <ContextMenu.Trigger>{control}</ContextMenu.Trigger>
      <ContextMenu.Items>{menuButtons(actions ?? [])}</ContextMenu.Items>
    </ContextMenu>
  );
}

/**
 * An action row. The default style is SwiftUI's list button (tinted, or red
 * for `destructive`, with the row highlight); `prominent` is a full-width
 * borderedProminent button, floating on the background in a plain Section.
 */
export function ButtonRow({ label, icon, role = 'default', prominent = false, disabled = false, onPress }: ButtonRowProps) {
  const plain = useIsPlainSection();
  const chrome = useRowChrome({ flushInPlain: prominent });
  const symbol = sf(icon);
  const swiftRole = role === 'destructive' ? 'destructive' : undefined;

  if (!prominent) {
    return (
      <Button
        label={label}
        systemImage={symbol}
        role={swiftRole}
        onPress={onPress}
        modifiers={[disabledModifier(disabled), ...chrome]}
      />
    );
  }

  const fill = frame({ maxWidth: Infinity });
  return (
    <Button
      role={swiftRole}
      onPress={onPress}
      modifiers={[
        buttonStyle('borderedProminent'),
        controlSize('large'),
        disabledModifier(disabled),
        // Inside a card the button keeps the row's padding; floating, it
        // spans the card width like a sheet's main button.
        ...(plain ? [] : [padding({ vertical: 4 })]),
        ...chrome,
      ]}>
      {symbol ? (
        <Label title={label} systemImage={symbol} modifiers={[fill]} />
      ) : (
        <Text modifiers={[fill, font({ textStyle: 'body', weight: 'semibold' })]}>{label}</Text>
      )}
    </Button>
  );
}

// MARK: - Row parts

/** The leading column's width for dots and glyphs: CheckRow's circle, so titles line up in mixed lists. */
const LEADING_COLUMN = 24;

function RowLeading({ icon, iconColor, dotColor, dotShape, mark, dimmed }: {
  icon?: IconValue;
  iconColor?: HexColor;
  dotColor?: HexColor;
  dotShape: 'dot' | 'square';
  mark?: RowMark;
  dimmed: boolean;
}) {
  const palette = usePalette();
  const symbol = sf(icon);
  if (symbol) {
    return (
      <Image
        systemName={symbol}
        modifiers={[
          font({ textStyle: 'body' }),
          dimmed ? tertiaryLabelText : foregroundStyle(iconColor ?? palette.tint),
          // A minimum column keeps titles aligned whatever the symbol's width,
          // and lets wide symbols grow at large text sizes instead of
          // overflowing into the title. fixedSize keeps the HStack from
          // squeezing the column back to 28pt for the higher-priority title.
          frame({ minWidth: 28 }),
          fixedSize({ horizontal: true }),
        ]}
      />
    );
  }
  if (mark) return <Mark mark={mark} dimmed={dimmed} />;
  if (dotColor) {
    const swatch = [foregroundStyle(dotColor), frame({ width: 10, height: 10 })];
    return (
      <ZStack modifiers={[frame({ width: LEADING_COLUMN })]}>
        {dotShape === 'square' ? <RoundedRectangle cornerRadius={3} modifiers={swatch} /> : <Circle modifiers={swatch} />}
      </ZStack>
    );
  }
  return null;
}

/** Period badges: 40pt wide, taller for a 連堂's two numerals. */
const PERIOD_WIDTH = 40;
const PERIOD_RADIUS = 12;

function Mark({ mark, dimmed }: { mark: RowMark; dimmed: boolean }) {
  const quiet = dimmed ? tertiaryLabelText : secondaryLabelText;
  switch (mark.kind) {
    case 'glyph':
      return (
        <Text
          modifiers={[
            font({ textStyle: 'subheadline', weight: 'bold' }),
            dimmed ? tertiaryLabelText : labelText,
            frame({ minWidth: LEADING_COLUMN }),
            fixedSize({ horizontal: true }),
          ]}>
          {mark.text}
        </Text>
      );
    case 'index':
      return (
        <Text
          modifiers={[
            font({ textStyle: 'body' }),
            quiet,
            monospacedDigit(),
            frame({ minWidth: LEADING_COLUMN }),
            fixedSize({ horizontal: true }),
          ]}>
          {mark.text}
        </Text>
      );
    case 'date':
      return (
        <VStack spacing={0} modifiers={[frame({ minWidth: PERIOD_WIDTH }), fixedSize({ horizontal: true })]}>
          <Text modifiers={[font({ textStyle: 'caption' }), quiet]}>{mark.weekday}</Text>
          <Text modifiers={[font({ textStyle: 'title3', weight: 'semibold' }), dimmed ? tertiaryLabelText : labelText, monospacedDigit()]}>
            {mark.day}
          </Text>
        </VStack>
      );
    case 'period': {
      const height = mark.lines.length > 1 ? 52 : PERIOD_WIDTH;
      return (
        <ZStack modifiers={[frame({ width: PERIOD_WIDTH, height })]}>
          {mark.empty ? (
            <RoundedRectangle
              cornerRadius={PERIOD_RADIUS}
              modifiers={[
                foregroundStyle('#00000000'),
                strokeBorder({
                  content: PlatformColor('separator'),
                  style: { lineWidth: 1.5, dash: [4, 3] },
                  shape: 'roundedRectangle',
                  cornerRadius: PERIOD_RADIUS,
                }),
              ]}
            />
          ) : (
            <RoundedRectangle cornerRadius={PERIOD_RADIUS} modifiers={[foregroundStyle(mark.fill ?? QUIET_FILL)]} />
          )}
          <VStack spacing={0}>
            {mark.lines.map((line, index) => (
              <Text
                key={`${index}-${line}`}
                modifiers={[
                  font({ size: 17, weight: 'bold' }),
                  mark.empty ? tertiaryLabelText : mark.ink ? foregroundStyle(mark.ink) : secondaryLabelText,
                  dynamicTypeSize({ max: 'xLarge' }),
                ]}>
                {line}
              </Text>
            ))}
          </VStack>
        </ZStack>
      );
    }
  }
}

/** A small grey tag above a title, e.g. 116升學. */
function Tag({ text }: { text: string }) {
  return (
    <Text
      modifiers={[
        font({ textStyle: 'caption', weight: 'semibold' }),
        secondaryLabelText,
        padding({ horizontal: 6, vertical: 2 }),
        background(QUIET_FILL, shapes.roundedRectangle({ cornerRadius: 6 })),
        lineLimit(1),
        fixedSize(),
      ]}>
      {text}
    </Text>
  );
}

/** A toggle as its own trailing button (the 美食 hearts): the active icon in its colour, or the icon greyed. */
function ToggleButton({ toggle }: { toggle: RowToggle }) {
  const palette = usePalette();
  return (
    <Button
      onPress={toggle.onPress}
      modifiers={[
        buttonStyle('borderless'),
        accessibilityLabel(toggle.label),
        ...(toggle.active ? [accessibilityAddTraits(['isSelected'])] : []),
      ]}>
      <Image
        systemName={sf(toggle.active ? toggle.activeIcon : toggle.icon)}
        modifiers={[
          font({ textStyle: 'title3' }),
          toggle.active ? foregroundStyle(toggle.activeColor ?? palette.tint) : secondaryLabelText,
          frame({ width: 44, height: 44 }),
          FULL_ROW,
        ]}
      />
    </Button>
  );
}

/** A small filled pill after the title (目前, 今天). */
function Badge({ text }: { text: string }) {
  const palette = usePalette();
  return (
    <Text
      modifiers={[
        font({ textStyle: 'caption2', weight: 'semibold' }),
        foregroundStyle(palette.onTint),
        padding({ horizontal: 6, vertical: 2 }),
        background(palette.tint, shapes.capsule()),
        fixedSize(),
      ]}>
      {text}
    </Text>
  );
}

/**
 * Row.footer: kit inline elements as they are, and bare text (a status line
 * such as 更新中) as a footnote; a raw string cannot sit in a SwiftUI stack.
 */
function footerContent(footer: ReactNode, style: ModifierConfig) {
  return Children.map(footer, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <Text modifiers={[font({ textStyle: 'footnote' }), style]}>{String(child)}</Text>
    ) : (
      child
    ),
  );
}

function Accessory({ kind }: { kind: RowAccessory }) {
  const palette = usePalette();
  switch (kind) {
    case 'chevron':
    case 'external':
      // Drawn like UIKit's disclosure indicator; arrow.up.right marks links
      // that leave the app.
      return (
        <Image
          systemName={kind === 'chevron' ? 'chevron.right' : 'arrow.up.right'}
          modifiers={[font({ textStyle: 'footnote', weight: 'semibold' }), tertiaryLabelText]}
        />
      );
    case 'checkmark':
      return (
        <Image
          systemName="checkmark"
          modifiers={[font({ textStyle: 'body', weight: 'semibold' }), foregroundStyle(palette.tint)]}
        />
      );
    default:
      return null;
  }
}

// MARK: - Swipe actions and context menu

/**
 * Wraps a row in its context menu and swipe actions: `actions` swipe in from
 * the trailing edge, the `toggle` from the leading edge (like Mail's
 * read/unread), and both are listed in the long-press menu. Without
 * `fullSwipe` (a disabled row) swiping only reveals the buttons; a full swipe
 * would otherwise fire the edge one, often a destructive action.
 */
function RowMenus({ chrome, actions = [], toggle, fullSwipe = true, children }: {
  chrome: ModifierConfig[];
  actions?: readonly RowAction[];
  toggle?: RowToggle;
  fullSwipe?: boolean;
  children: ReactElement;
}) {
  const palette = usePalette();
  const trailing = trailingSwipeActions(actions);
  const firstPlain = trailing.findIndex((action) => !action.destructive);
  return (
    <SwipeActions modifiers={chrome}>
      <ContextMenu>
        <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
        <ContextMenu.Items>
          {toggle ? <Button label={toggle.label} systemImage={toggleSymbol(toggle)} onPress={toggle.onPress} /> : null}
          {menuButtons(actions)}
        </ContextMenu.Items>
      </ContextMenu>
      {trailing.length > 0 ? (
        <SwipeActions.Actions edge="trailing" allowsFullSwipe={fullSwipe}>
          {trailing.map((action, index) => (
            <Button
              key={action.key}
              label={action.label}
              systemImage={sf(action.icon)}
              onPress={action.onPress}
              // Red by tint, not role: SwiftUI animates a destructive-role
              // swipe button as a row deletion right away, but screens confirm
              // deletions with an alert first and may keep the row.
              modifiers={[tint(action.destructive ? DESTRUCTIVE : index === firstPlain ? palette.tint : NEUTRAL)]}
            />
          ))}
        </SwipeActions.Actions>
      ) : null}
      {toggle ? (
        <SwipeActions.Actions edge="leading" allowsFullSwipe={fullSwipe}>
          <Button
            label={toggle.label}
            systemImage={toggleSymbol(toggle)}
            onPress={toggle.onPress}
            modifiers={[tint(palette.tint)]}
          />
        </SwipeActions.Actions>
      ) : null}
    </SwipeActions>
  );
}

/** The symbol of the state a toggle press leads to (heart.fill to favourite, heart to undo). */
function toggleSymbol(toggle: RowToggle) {
  return sf(toggle.active ? toggle.icon : toggle.activeIcon);
}

function menuButtons(actions: readonly RowAction[]) {
  return actions.map((action) => (
    <Button
      key={action.key}
      label={action.label}
      systemImage={sf(action.icon)}
      role={action.destructive ? 'destructive' : undefined}
      onPress={action.onPress}
      modifiers={action.disabled ? [disabledModifier(true)] : undefined}
    />
  ));
}
