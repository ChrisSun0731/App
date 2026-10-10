import {
  Box,
  Button,
  Checkbox,
  Column,
  DatePickerDialog,
  DropdownMenu,
  DropdownMenuItem,
  FlowRow,
  Icon,
  IconButton,
  ListItem,
  Row as ComposeRow,
  Spacer,
  Switch,
  Text,
  type ListItemColors,
  type MaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  border,
  clickable,
  clip,
  combinedClickable,
  fillMaxWidth,
  height,
  padding,
  semantics,
  Shapes,
  size,
  background as backgroundModifier,
  toggleable,
  width,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';

import { icons } from '@/components/icons';
import { isDateKey } from '@/lib/dates';

import { overflowMenuLabel } from '../labels';
import type {
  ButtonRowProps,
  CheckRowProps,
  DateRowProps,
  RowAccessory,
  RowAction,
  RowMark,
  RowProps,
  ToggleRowProps,
} from '../types';
import { RowDivider } from './divider';
import {
  dialogDateFromKey,
  dialogMinimumFromKey,
  formatDateLabel,
  joinLabel,
  keyFromDialogDate,
  withAlpha,
} from './helpers';
import { iconSource, TRANSPARENT, useInCard, useM3 } from './theme';

/** Material's disabled-content opacity. */
const DISABLED = 0.38;

/** ListItem colours for a row inside a card: no container of its own unless `background` is set. */
function rowColors(m: MaterialColors, disabled: boolean, background?: string): ListItemColors {
  const fade = (color: string) => (disabled ? withAlpha(color, DISABLED) : color);
  return {
    containerColor: background ?? TRANSPARENT,
    contentColor: fade(m.onSurface),
    overlineContentColor: fade(m.onSurfaceVariant),
    supportingContentColor: fade(m.onSurfaceVariant),
    leadingContentColor: fade(m.onSurfaceVariant),
    trailingContentColor: fade(m.onSurfaceVariant),
  };
}

/**
 * The row's own tap target. With `actions`, a long press opens the same
 * overflow menu (the Android counterpart of the iOS context menu). A disabled
 * row passes no `onPress` and keeps only its overflow button, like a row that
 * opens nothing.
 */
function pressModifiers(onPress: (() => void) | undefined, onLongPress: (() => void) | undefined): ModifierConfig[] {
  if (!onPress) return [];
  return [onLongPress ? combinedClickable({ onClick: onPress, onLongClick: onLongPress }) : clickable(onPress)];
}

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
  background,
  badge,
  emphasized = false,
  titleLines = 2,
  accessory = 'none',
  onPress,
  actions,
  toggle,
  footer,
  accessibilityLabel,
  disabled = false,
}: RowProps) {
  const m = useM3();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = !!actions?.length;
  const fade = (color: string) => (disabled ? withAlpha(color, DISABLED) : color);
  const titleColor = emphasized ? fade(m.primary) : undefined;

  // ListItem merges its descendants into one accessibility node. An explicit
  // description wins over the merged texts, so it lists everything the row
  // shows; inline footer elements add their own descriptions to it.
  const label = accessibilityLabel ?? joinLabel([...(tags ?? []), title, titleAside, overline, subtitle, note, detail, badge]);
  const modifiers = [
    semantics({ contentDescription: label }),
    ...pressModifiers(disabled ? undefined : onPress, hasActions ? () => setMenuOpen(true) : undefined),
  ];

  const titleText = (
    <Text
      color={titleColor}
      maxLines={titleLines}
      overflow="ellipsis"
      style={{ typography: 'bodyLarge', fontWeight: strong ? '700' : emphasized ? '600' : undefined }}>
      {title}
    </Text>
  );
  const asideText = titleAside ? (
    <Text color={m.onSurfaceVariant} maxLines={1} style={{ typography: 'bodyMedium' }}>
      {titleAside}
    </Text>
  ) : null;

  // Every ListItem row below returns its Section-controlled leading divider
  // next to the item (see divider.tsx); both land in the card's column.
  return (
    <>
      <RowDivider />
      <ListItem colors={rowColors(m, disabled, background)} modifiers={modifiers}>
        {overline || tags?.length ? (
          <ListItem.OverlineContent>
            {tags?.length ? (
              <FlowRow horizontalArrangement={{ spacedBy: 4 }} verticalArrangement={{ spacedBy: 4 }}>
                {tags.map((tag) => (
                  <Tag key={tag} text={tag} />
                ))}
              </FlowRow>
            ) : (
              <Text color={titleColor} style={{ typography: 'labelMedium' }}>
                {overline}
              </Text>
            )}
          </ListItem.OverlineContent>
        ) : null}
        <ListItem.HeadlineContent>
          {badge || asideText ? (
            // A FlowRow puts the badge or nickname right after a short title
            // and moves it under a long one instead of squeezing the title.
            <FlowRow horizontalArrangement={{ spacedBy: 8 }} verticalArrangement={{ spacedBy: 4 }}>
              {titleText}
              {asideText}
              {badge ? <Badge label={badge} /> : null}
            </FlowRow>
          ) : (
            titleText
          )}
        </ListItem.HeadlineContent>
        {subtitle || note || footer ? (
          <ListItem.SupportingContent>
            <Column verticalArrangement={{ spacedBy: 6 }}>
              {subtitle ? (
                <ComposeRow verticalAlignment="center" horizontalArrangement={{ spacedBy: 6 }}>
                  {subtitleDotColor ? <Box modifiers={[size(8, 8), clip(Shapes.Circle), backgroundModifier(fade(subtitleDotColor))]} /> : null}
                  <Text color={emphasized ? fade(m.primary) : undefined} style={{ typography: 'bodyMedium' }}>
                    {subtitle}
                  </Text>
                </ComposeRow>
              ) : null}
              {note ? <Text style={{ typography: 'bodyMedium' }}>{note}</Text> : null}
              {footer}
            </Column>
          </ListItem.SupportingContent>
        ) : null}
        {icon || dotColor || mark ? (
          <ListItem.LeadingContent>
            {icon ? (
              <Icon source={iconSource(icon)} size={24} tint={fade(iconColor ?? m.primary)} />
            ) : mark ? (
              <Mark mark={mark} fade={fade} />
            ) : (
              <Dot color={fade(dotColor ?? m.primary)} square={dotShape === 'square'} />
            )}
          </ListItem.LeadingContent>
        ) : null}
        {detail || toggle || hasActions || accessory !== 'none' ? (
          <ListItem.TrailingContent>
            <ComposeRow verticalAlignment="center" horizontalArrangement={{ spacedBy: 4 }}>
              {detail ? (
                <Text
                  color={detailProminent ? fade(m.onSurface) : undefined}
                  maxLines={2}
                  overflow="ellipsis"
                  style={
                    detailProminent
                      ? { typography: 'bodyLarge', fontWeight: '600', textAlign: 'end' }
                      : { typography: 'bodyMedium', textAlign: 'end' }
                  }>
                  {detail}
                </Text>
              ) : null}
              {toggle ? (
                // Stays available on a disabled row (only its own tap is off),
                // so it is tinted explicitly instead of taking the faded
                // trailing colour.
                <IconButton onClick={toggle.onPress}>
                  <Icon
                    source={iconSource(toggle.active ? toggle.activeIcon : toggle.icon)}
                    size={24}
                    tint={toggle.active ? (toggle.activeColor ?? m.primary) : m.onSurfaceVariant}
                    contentDescription={toggle.label}
                  />
                </IconButton>
              ) : null}
              {hasActions ? (
                <OverflowMenu actions={actions} rowName={title} expanded={menuOpen} onExpandedChange={setMenuOpen} />
              ) : null}
              <Accessory accessory={accessory} m={m} />
            </ComposeRow>
          </ListItem.TrailingContent>
        ) : null}
      </ListItem>
    </>
  );
}

/** Leading colour dot (or an event's small square), centred in the 24dp slot an icon would take so titles line up. */
function Dot({ color, square = false }: { color: string; square?: boolean }) {
  return (
    <Box modifiers={[size(24, 24)]} contentAlignment="center">
      <Box modifiers={[size(12, 12), clip(square ? Shapes.RoundedCorner(3) : Shapes.Circle), backgroundModifier(color)]} />
    </Box>
  );
}

/** A leading text mark: 考, a date (四 over 8), a list number or a period badge in the subject's colours. */
function Mark({ mark, fade }: { mark: RowMark; fade: (color: string) => string }) {
  const m = useM3();
  switch (mark.kind) {
    case 'glyph':
      return (
        <Box modifiers={[size(24, 24)]} contentAlignment="center">
          <Text color={fade(m.onSurface)} style={{ typography: 'titleSmall', fontWeight: '700' }}>
            {mark.text}
          </Text>
        </Box>
      );
    case 'index':
      return (
        <Box modifiers={[size(24, 24)]} contentAlignment="center">
          <Text color={fade(m.onSurfaceVariant)} style={{ typography: 'bodyLarge' }}>
            {mark.text}
          </Text>
        </Box>
      );
    case 'date':
      return (
        <Column modifiers={[width(40)]} horizontalAlignment="center">
          <Text color={fade(m.onSurfaceVariant)} style={{ typography: 'labelSmall' }}>
            {mark.weekday}
          </Text>
          <Text color={fade(m.onSurface)} style={{ typography: 'titleLarge', fontWeight: '600' }}>
            {mark.day}
          </Text>
        </Column>
      );
    case 'period': {
      const shape = [width(40), height(mark.lines.length > 1 ? 52 : 40), clip(Shapes.RoundedCorner(12))];
      return (
        <Box
          contentAlignment="center"
          modifiers={
            mark.empty
              ? [...shape, border(1.5, m.outlineVariant)]
              : [...shape, backgroundModifier(mark.fill ?? m.surfaceContainerHighest)]
          }>
          <Column horizontalAlignment="center">
            {mark.lines.map((line, index) => (
              <Text
                key={`${index}-${line}`}
                color={fade(mark.empty ? m.outline : (mark.ink ?? m.onSurfaceVariant))}
                style={{ typography: 'titleMedium', fontWeight: '700' }}>
                {line}
              </Text>
            ))}
          </Column>
        </Box>
      );
    }
  }
}

/** A small grey tag over a title, e.g. 116升學. */
function Tag({ text }: { text: string }) {
  const m = useM3();
  return (
    <Box modifiers={[clip(Shapes.RoundedCorner(6)), backgroundModifier(m.surfaceContainerHighest), padding(6, 2, 6, 2)]}>
      <Text color={m.onSurfaceVariant} maxLines={1} style={{ typography: 'labelSmall', fontWeight: '600' }}>
        {text}
      </Text>
    </Box>
  );
}

/** Small tonal pill after a row title (目前, 今天). */
function Badge({ label }: { label: string }) {
  const m = useM3();
  return (
    <Box
      modifiers={[
        // Centres the 20dp pill on the first 24sp line of the bodyLarge title.
        padding(0, 2, 0, 0),
        clip(Shapes.RoundedCorner(10)),
        backgroundModifier(m.primaryContainer),
        padding(8, 2, 8, 2),
      ]}>
      <Text color={m.onPrimaryContainer} maxLines={1} style={{ typography: 'labelMedium' }}>
        {label}
      </Text>
    </Box>
  );
}

function Accessory({ accessory, m }: { accessory: RowAccessory; m: MaterialColors }) {
  switch (accessory) {
    case 'chevron':
      return <Icon source={iconSource(icons.chevronRight)} size={24} />;
    case 'external':
      return <Icon source={iconSource(icons.openExternal)} size={20} />;
    case 'checkmark':
      return <Icon source={iconSource(icons.check)} size={24} tint={m.primary} contentDescription="已選取" />;
    case 'none':
      return null;
  }
}

/**
 * A more_vert icon button opening a dropdown of the row's actions. It is
 * always enabled, also on a disabled row; a disabled action is a greyed item.
 */
function OverflowMenu({
  actions,
  rowName,
  expanded,
  onExpandedChange,
}: {
  actions: readonly RowAction[];
  /** The row's title, so TalkBack can tell one row's button from the next. */
  rowName: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const m = useM3();
  return (
    <DropdownMenu expanded={expanded} onDismissRequest={() => onExpandedChange(false)}>
      <DropdownMenu.Trigger>
        <IconButton onClick={() => onExpandedChange(true)}>
          {/* Tinted explicitly: a disabled row fades its trailing colour, but not this button. */}
          <Icon
            source={iconSource(icons.more)}
            size={24}
            tint={m.onSurfaceVariant}
            contentDescription={overflowMenuLabel(rowName)}
          />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            enabled={!action.disabled}
            elementColors={
              action.destructive
                ? {
                    textColor: m.error,
                    leadingIconColor: m.error,
                    disabledTextColor: withAlpha(m.error, DISABLED),
                    disabledLeadingIconColor: withAlpha(m.error, DISABLED),
                  }
                : undefined
            }
            onClick={() => {
              onExpandedChange(false);
              action.onPress();
            }}>
            <DropdownMenuItem.Text>
              <Text style={{ typography: 'labelLarge' }}>{action.label}</Text>
            </DropdownMenuItem.Text>
            {action.icon ? (
              <DropdownMenuItem.LeadingIcon>
                <Icon source={iconSource(action.icon)} size={24} />
              </DropdownMenuItem.LeadingIcon>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

export function CheckRow({ title, subtitle, checked, onCheckedChange, onPress, actions }: CheckRowProps) {
  const m = useM3();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = !!actions?.length;

  // With `onPress` the body edits and only the checkbox checks; without it the
  // whole row is the checkbox (and the box itself just shows the state).
  const modifiers = onPress
    ? pressModifiers(onPress, hasActions ? () => setMenuOpen(true) : undefined)
    : [toggleable(checked, () => onCheckedChange(!checked), { role: 'checkbox' })];

  return (
    <>
      <RowDivider />
      <ListItem colors={rowColors(m, false)} modifiers={modifiers}>
        <ListItem.LeadingContent>
          {/* With onCheckedChange the box is a TalkBack stop of its own (only
              the body merges into the row), so it is named after the item. */}
          <Checkbox
            value={checked}
            onCheckedChange={onPress ? onCheckedChange : undefined}
            modifiers={onPress ? [semantics({ contentDescription: title })] : undefined}
          />
        </ListItem.LeadingContent>
        <ListItem.HeadlineContent>
          <Text
            color={checked ? m.onSurfaceVariant : undefined}
            maxLines={2}
            overflow="ellipsis"
            style={{ typography: 'bodyLarge', textDecoration: checked ? 'lineThrough' : undefined }}>
            {title}
          </Text>
        </ListItem.HeadlineContent>
        {subtitle ? (
          <ListItem.SupportingContent>
            <Text style={{ typography: 'bodyMedium' }}>{subtitle}</Text>
          </ListItem.SupportingContent>
        ) : null}
        {hasActions ? (
          <ListItem.TrailingContent>
            <OverflowMenu actions={actions} rowName={title} expanded={menuOpen} onExpandedChange={setMenuOpen} />
          </ListItem.TrailingContent>
        ) : null}
      </ListItem>
    </>
  );
}

export function ToggleRow({ label, subtitle, icon, value, onValueChange, disabled = false, actions }: ToggleRowProps) {
  const m = useM3();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = !!actions?.length;

  return (
    <>
      <RowDivider />
      <ListItem
        colors={rowColors(m, disabled)}
        // The whole row flips the switch, as in Android Settings.
        modifiers={disabled ? [] : [toggleable(value, () => onValueChange(!value), { role: 'switch' })]}>
        {icon ? (
          <ListItem.LeadingContent>
            <Icon source={iconSource(icon)} size={24} tint={disabled ? withAlpha(m.primary, DISABLED) : m.primary} />
          </ListItem.LeadingContent>
        ) : null}
        <ListItem.HeadlineContent>
          <Text maxLines={2} overflow="ellipsis" style={{ typography: 'bodyLarge' }}>
            {label}
          </Text>
        </ListItem.HeadlineContent>
        {subtitle ? (
          <ListItem.SupportingContent>
            <Text style={{ typography: 'bodyMedium' }}>{subtitle}</Text>
          </ListItem.SupportingContent>
        ) : null}
        <ListItem.TrailingContent>
          <ComposeRow verticalAlignment="center" horizontalArrangement={{ spacedBy: 4 }}>
            {/* @expo/ui's Switch always passes onCheckedChange, which makes it
                a TalkBack stop of its own next to the row; give it the label. */}
            <Switch
              value={value}
              enabled={!disabled}
              onCheckedChange={onValueChange}
              modifiers={[semantics({ contentDescription: label })]}
            />
            {/* Enabled while the switch is off-limits: 上移/下移 still apply. */}
            {hasActions ? (
              <OverflowMenu actions={actions} rowName={label} expanded={menuOpen} onExpandedChange={setMenuOpen} />
            ) : null}
          </ComposeRow>
        </ListItem.TrailingContent>
      </ListItem>
    </>
  );
}

export function ButtonRow({ label, icon, role = 'default', prominent = false, disabled = false, onPress }: ButtonRowProps) {
  const m = useM3();
  const inCard = useInCard();
  const destructive = role === 'destructive';

  if (prominent) {
    return (
      <Box modifiers={[fillMaxWidth(), inCard ? padding(16, 12, 16, 12) : padding(0, 4, 0, 4)]}>
        <Button
          onClick={onPress}
          enabled={!disabled}
          contentPadding={{ start: 24, top: 12, end: 24, bottom: 12 }}
          colors={destructive ? { containerColor: m.error, contentColor: m.onError } : undefined}
          modifiers={[fillMaxWidth()]}>
          {icon ? <Icon source={iconSource(icon)} size={18} /> : null}
          {icon ? <Spacer modifiers={[width(8)]} /> : null}
          <Text style={{ typography: 'labelLarge' }}>{label}</Text>
        </Button>
      </Box>
    );
  }

  // A text-button-like row: the label and icon in the primary (or error)
  // colour, the whole row as the tap target.
  const tint = disabled ? withAlpha(destructive ? m.error : m.primary, DISABLED) : destructive ? m.error : m.primary;
  return (
    <>
      <RowDivider />
      <ListItem colors={rowColors(m, disabled)} modifiers={disabled ? [] : [clickable(onPress)]}>
        {icon ? (
          <ListItem.LeadingContent>
            <Icon source={iconSource(icon)} size={24} tint={tint} />
          </ListItem.LeadingContent>
        ) : null}
        <ListItem.HeadlineContent>
          <Text color={tint} style={{ typography: 'bodyLarge', fontWeight: '500' }}>
            {label}
          </Text>
        </ListItem.HeadlineContent>
      </ListItem>
    </>
  );
}

export function DateRow({ label, value, onChange, minimumDate }: DateRowProps) {
  const m = useM3();
  const [open, setOpen] = useState(false);
  const valid = isDateKey(value);

  return (
    <>
      <RowDivider />
      {/* The dialog lives next to the row in the Box and takes no space. */}
      <Box modifiers={[fillMaxWidth()]}>
        <ListItem colors={rowColors(m, false)} modifiers={[clickable(() => setOpen(true))]}>
          <ListItem.LeadingContent>
            <Icon source={iconSource(icons.calendar)} size={24} tint={m.primary} />
          </ListItem.LeadingContent>
          <ListItem.HeadlineContent>
            <Text style={{ typography: 'bodyLarge' }}>{label}</Text>
          </ListItem.HeadlineContent>
          <ListItem.SupportingContent>
            <Text style={{ typography: 'bodyMedium' }}>{valid ? formatDateLabel(value) : '未選擇日期'}</Text>
          </ListItem.SupportingContent>
        </ListItem>
        {open ? (
          <DatePickerDialog
            initialDate={valid ? dialogDateFromKey(value) : null}
            selectableDates={minimumDate ? { start: dialogMinimumFromKey(minimumDate) } : undefined}
            confirmButtonLabel="確定"
            dismissButtonLabel="取消"
            onDateSelected={(date) => {
              setOpen(false);
              onChange(keyFromDialogDate(date));
            }}
            onDismissRequest={() => setOpen(false)}
          />
        ) : null}
      </Box>
    </>
  );
}
