import {
  Box,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Row,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { padding, semantics, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { Stack } from 'expo-router';
import { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { usePalette } from '@/theme/palette';
import { withAlpha } from '@/ui/android/helpers';

import type {
  HeaderActionsProps,
  HeaderItem,
  HeaderMenuAction,
  HeaderMenuEntry,
  HeaderSubmenu,
} from './header-actions.types';
import { icons } from './icons';

/** Material's disabled-content opacity. */
const DISABLED_ALPHA = 0.38;

type MenuItem = Extract<HeaderItem, { kind: 'menu' }>;

/**
 * Top app bar actions for the current screen, drawn with Material 3 Compose
 * components: icon buttons, text buttons and an overflow dropdown menu.
 */
export function HeaderActions({ left, right }: HeaderActionsProps) {
  // Both sides are always set, so a side left empty clears what an earlier
  // view on the same screen put there (美食's 熱食部 ‹ 本週 › when 附近 shows);
  // undefined is the default (the back button on a pushed screen).
  return (
    <Stack.Screen
      options={{
        headerLeft: left?.length ? () => <ActionRow items={left} /> : undefined,
        headerRight: right?.length ? () => <ActionRow items={right} /> : undefined,
      }}
    />
  );
}

function ActionRow({ items }: { items: HeaderItem[] }) {
  return (
    <Host matchContents>
      <Row verticalAlignment="center">
        {items.map((item) => (
          <Action key={item.key} item={item} />
        ))}
      </Row>
    </Host>
  );
}

/**
 * The tint of a header icon: the top app bar's secondary colour, or
 * Material's disabled content colour (onSurface at 38%) while disabled. The
 * tint is explicit, so IconButton's own disabled colour would never show.
 */
function useIconTint(disabled: boolean | undefined): string {
  const palette = usePalette();
  return disabled ? withAlpha(palette.text as string, DISABLED_ALPHA) : (palette.textSecondary as string);
}

function Action({ item }: { item: HeaderItem }) {
  switch (item.kind) {
    case 'icon':
      return <HeaderIconButton item={item} />;
    case 'text':
      return (
        <TextButton
          onClick={item.onPress}
          enabled={!item.disabled}
          modifiers={item.accessibilityLabel ? [semantics({ contentDescription: item.accessibilityLabel })] : undefined}>
          <Text>{item.label}</Text>
        </TextButton>
      );
    case 'menu':
      return <HeaderMenu item={item} />;
    case 'segmented':
      return <HeaderSegmented item={item} />;
  }
}

/** Material segmented buttons sized to their labels, e.g. 日 / 週. */
function HeaderSegmented({ item }: { item: Extract<HeaderItem, { kind: 'segmented' }> }) {
  return (
    // SegmentedButton derives its corner shapes from its index among the
    // row's native children, so the buttons must be direct children.
    // The buttons share the row's width equally and the selected one adds a
    // check, so the row is sized for the longest label with its check.
    <SingleChoiceSegmentedButtonRow
      modifiers={[
        padding(4, 0, 4, 0),
        width(item.options.length * (Math.max(...item.options.map((option) => option.label.length)) * 16 + 56)),
      ]}>
      {item.options.map((option) => (
        <SegmentedButton
          key={option.value}
          selected={option.value === item.value}
          onClick={() => item.onChange(option.value)}
          modifiers={[semantics({ contentDescription: `${item.label}：${option.label}` })]}>
          <SegmentedButton.Label>
            <Text maxLines={1} style={{ typography: 'labelLarge' }}>
              {option.label}
            </Text>
          </SegmentedButton.Label>
        </SegmentedButton>
      ))}
    </SingleChoiceSegmentedButtonRow>
  );
}

function HeaderIconButton({ item }: { item: Extract<HeaderItem, { kind: 'icon' }> }) {
  const tint = useIconTint(item.disabled);
  return (
    <IconButton onClick={item.onPress} enabled={!item.disabled}>
      <Icon source={item.icon as ImageSourcePropType} size={24} tint={tint} contentDescription={item.label} />
    </IconButton>
  );
}

/**
 * An icon button opening a DropdownMenu. A submenu entry (trailing arrow)
 * swaps the open menu's items for the submenu's actions under a back item,
 * as Material's cascading menus do on phones; closing the menu returns it to
 * the top level.
 */
function HeaderMenu({ item }: { item: MenuItem }) {
  const palette = usePalette();
  const tint = useIconTint(item.disabled);
  const [expanded, setExpanded] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const submenu = item.actions.find(
    (entry): entry is HeaderSubmenu => entry.kind === 'submenu' && entry.key === openKey,
  );

  function close() {
    setExpanded(false);
    setOpenKey(null);
  }

  // Labels line up: once any entry shows a leading icon or check, every entry
  // keeps the leading slot (empty where it has none). The back item always
  // has one.
  const entries: HeaderMenuEntry[] = submenu ? submenu.actions : item.actions;
  const leadingSlot = submenu !== undefined || entries.some(hasLeading);
  const textSecondary = palette.textSecondary as string;

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close}>
      <DropdownMenu.Trigger>
        <IconButton onClick={() => setExpanded(true)} enabled={!item.disabled}>
          <Icon source={item.icon as ImageSourcePropType} size={24} tint={tint} contentDescription={item.label} />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {submenu ? (
          <DropdownMenuItem key="back" onClick={() => setOpenKey(null)}>
            <DropdownMenuItem.Text>
              <Text>{submenu.label}</Text>
            </DropdownMenuItem.Text>
            <DropdownMenuItem.LeadingIcon>
              <Icon
                source={icons.back as ImageSourcePropType}
                size={24}
                tint={textSecondary}
                contentDescription="返回"
              />
            </DropdownMenuItem.LeadingIcon>
          </DropdownMenuItem>
        ) : null}
        {entries.map((entry) =>
          entry.kind === 'submenu' ? (
            <DropdownMenuItem key={entry.key} onClick={() => setOpenKey(entry.key)}>
              <DropdownMenuItem.Text>
                <Text>{entry.label}</Text>
              </DropdownMenuItem.Text>
              {leadingSlot ? <Leading icon={entry.icon} tint={textSecondary} /> : null}
              <DropdownMenuItem.TrailingIcon>
                <Icon source={icons.chevronRight as ImageSourcePropType} size={24} tint={textSecondary} />
              </DropdownMenuItem.TrailingIcon>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={entry.key}
              onClick={() => {
                close();
                entry.onPress();
              }}>
              <DropdownMenuItem.Text>
                <Text color={entry.destructive ? (palette.danger as string) : undefined}>{entry.label}</Text>
              </DropdownMenuItem.Text>
              {leadingSlot ? (
                <Leading
                  icon={entry.selected ? icons.check : entry.icon}
                  tint={textSecondary}
                  // The check is the only sign of the choice, so TalkBack reads it.
                  contentDescription={entry.selected ? '已選取' : undefined}
                />
              ) : null}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

/** Whether an entry draws something in the leading slot (an icon, or a check that may appear). */
function hasLeading(entry: HeaderMenuEntry): boolean {
  return entry.icon !== undefined || (entry.kind !== 'submenu' && entry.selected !== undefined);
}

/** A menu item's leading slot: its icon, or an empty 24dp box that keeps the label aligned. */
function Leading({ icon, tint, contentDescription }: {
  icon: HeaderMenuAction['icon'];
  tint: string;
  contentDescription?: string;
}) {
  return (
    <DropdownMenuItem.LeadingIcon>
      {icon ? (
        <Icon source={icon as ImageSourcePropType} size={24} tint={tint} contentDescription={contentDescription} />
      ) : (
        <Box modifiers={[size(24, 24)]} />
      )}
    </DropdownMenuItem.LeadingIcon>
  );
}
