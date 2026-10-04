import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { Stack } from 'expo-router';
import { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { usePalette } from '@/theme/palette';

import type { HeaderActionsProps, HeaderItem } from './header-actions.types';

/**
 * Top app bar actions for the current screen, drawn with Material 3 Compose
 * components: icon buttons, text buttons and an overflow dropdown menu.
 */
export function HeaderActions({ left, right }: HeaderActionsProps) {
  return (
    <Stack.Screen
      options={{
        ...(left?.length ? { headerLeft: () => <ActionRow items={left} /> } : null),
        ...(right?.length ? { headerRight: () => <ActionRow items={right} /> } : null),
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

function Action({ item }: { item: HeaderItem }) {
  const palette = usePalette();
  const [expanded, setExpanded] = useState(false);

  switch (item.kind) {
    case 'icon':
      return (
        <IconButton onClick={item.onPress} enabled={!item.disabled}>
          <Icon
            source={item.icon as ImageSourcePropType}
            size={24}
            tint={palette.textSecondary as string}
            contentDescription={item.label}
          />
        </IconButton>
      );
    case 'text':
      return (
        <TextButton onClick={item.onPress} enabled={!item.disabled}>
          <Text>{item.label}</Text>
        </TextButton>
      );
    case 'menu':
      return (
        <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
          <DropdownMenu.Trigger>
            <IconButton onClick={() => setExpanded(true)}>
              <Icon
                source={item.icon as ImageSourcePropType}
                size={24}
                tint={palette.textSecondary as string}
                contentDescription={item.label}
              />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {item.actions.map((action) => (
              <DropdownMenuItem
                key={action.key}
                onClick={() => {
                  setExpanded(false);
                  action.onPress();
                }}>
                <DropdownMenuItem.Text>
                  <Text color={action.destructive ? (palette.danger as string) : undefined}>
                    {action.label}
                  </Text>
                </DropdownMenuItem.Text>
                {action.icon || action.selected ? (
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={(action.selected ? CHECK : action.icon) as ImageSourcePropType}
                      size={24}
                      tint={palette.textSecondary as string}
                    />
                  </DropdownMenuItem.LeadingIcon>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      );
  }
}

const CHECK = require('@expo/material-symbols/check.xml');
