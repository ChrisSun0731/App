import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

import type { HeaderActionsProps, HeaderItem, HeaderMenuAction, HeaderMenuEntry } from './header-actions.types';

/** Navigation-bar items for the current screen, as native UIBarButtonItems and menus. */
export function HeaderActions({ left, right }: HeaderActionsProps) {
  return (
    <>
      {left?.length ? <Stack.Toolbar placement="left">{left.map(renderItem)}</Stack.Toolbar> : null}
      {right?.length ? <Stack.Toolbar placement="right">{right.map(renderItem)}</Stack.Toolbar> : null}
    </>
  );
}

function renderItem(item: HeaderItem) {
  switch (item.kind) {
    case 'icon':
      return (
        <Stack.Toolbar.Button
          key={item.key}
          icon={item.icon as SFSymbol}
          variant={item.prominent ? 'done' : 'plain'}
          accessibilityLabel={item.label}
          disabled={item.disabled}
          onPress={item.onPress}
        />
      );
    case 'text':
      return (
        <Stack.Toolbar.Button
          key={item.key}
          variant={item.prominent ? 'done' : 'plain'}
          accessibilityLabel={item.accessibilityLabel}
          disabled={item.disabled}
          onPress={item.onPress}>
          {item.label}
        </Stack.Toolbar.Button>
      );
    case 'segmented':
      return (
        <Stack.Toolbar.View key={item.key}>
          <Segmented item={item} />
        </Stack.Toolbar.View>
      );
    case 'space':
      return <Stack.Toolbar.Spacer key={item.key} width={item.width ?? 8} />;
    case 'menu':
      return (
        <Stack.Toolbar.Menu
          key={item.key}
          icon={item.icon as SFSymbol}
          accessibilityLabel={item.label}
          disabled={item.disabled}>
          {item.actions.map(renderEntry)}
        </Stack.Toolbar.Menu>
      );
  }
}

/** A SwiftUI segmented picker sized to its labels, in the bar's glass. */
function Segmented({ item }: { item: Extract<HeaderItem, { kind: 'segmented' }> }) {
  return (
    <Host matchContents>
      <Picker<string>
        label={item.label}
        selection={item.value}
        onSelectionChange={item.onChange}
        modifiers={[pickerStyle('segmented'), labelsHidden()]}>
        {item.options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

/**
 * A menu entry. A submenu is a nested Stack.Toolbar.Menu, which expo-router
 * turns into a UIMenu child (its `title` is the row's label); `selected`
 * actions get UIKit's checkmark through `isOn`.
 */
function renderEntry(entry: HeaderMenuEntry) {
  if (entry.kind === 'submenu') {
    return (
      <Stack.Toolbar.Menu key={entry.key} title={entry.label} icon={entry.icon as SFSymbol | undefined}>
        {entry.actions.map(renderAction)}
      </Stack.Toolbar.Menu>
    );
  }
  return renderAction(entry);
}

function renderAction(action: HeaderMenuAction) {
  return (
    <Stack.Toolbar.MenuAction
      key={action.key}
      icon={action.icon as SFSymbol | undefined}
      destructive={action.destructive}
      isOn={action.selected}
      onPress={action.onPress}>
      {action.label}
    </Stack.Toolbar.MenuAction>
  );
}
