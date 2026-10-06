import {
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  FilterChip,
  FlowRow,
  Icon,
  OutlinedTextField,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
  useNativeState,
  type ObservableState,
  type TextFieldKeyboardType,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, menuAnchor, padding, rotate, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { icons } from '@/components/icons';

import type { FilterChipsProps, PickerRowProps, TextFieldRowProps } from '../types';
import { useSyncedText } from '../use-synced-text';
import { segmentsFit } from './helpers';
import { iconSource, useContentWidth, useInCard, useM3 } from './theme';

// Every control below draws its selection from props on each composition:
// Compose's SegmentedButton, FilterChip and ExposedDropdownMenu are stateless
// (SegmentedButtonView.kt, ChipView.kt pass `selected` straight through), and
// the menu's read-only text field is written from `value` only. So when the
// parent does not adopt a choice (e.g. a declined confirmation alert), nothing
// re-renders and the control keeps showing `value` — the contract that iOS
// needs useSnapBack (ui/ios/use-snap-back.ts) for holds here without one.

export function PickerRow<T extends string>(props: PickerRowProps<T>): ReactNode {
  return props.variant === 'segmented' ? <SegmentedPicker {...props} /> : <MenuPicker {...props} />;
}

function MenuPicker<T extends string>({ label, value, options, onChange, icon, disabled = false }: PickerRowProps<T>) {
  const m = useM3();
  const inCard = useInCard();
  const [expanded, setExpanded] = useState(false);
  const selected = options.find((option) => option.value === value)?.label ?? '';
  // The field owns its text in a native state; it is read-only, so only
  // `value` ever writes to it.
  const text = useNativeState(selected);
  useEffect(() => {
    if (text.get() !== selected) text.set(selected);
  }, [text, selected]);
  const open = expanded && !disabled;

  return (
    <ExposedDropdownMenuBox
      expanded={open}
      onExpandedChange={(next) => setExpanded(next && !disabled)}
      modifiers={[fillMaxWidth(), ...(inCard ? [padding(16, 8, 16, 12)] : [])]}>
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        enabled={!disabled}
        modifiers={[menuAnchor('primaryNotEditable', !disabled), fillMaxWidth()]}>
        <OutlinedTextField.Label>
          {/* The field always holds a value, so the label is always the small floating one. */}
          <Text style={{ typography: 'bodySmall' }}>{label}</Text>
        </OutlinedTextField.Label>
        {icon ? (
          <OutlinedTextField.LeadingIcon>
            <Icon source={iconSource(icon)} size={24} />
          </OutlinedTextField.LeadingIcon>
        ) : null}
        <OutlinedTextField.TrailingIcon>
          <Icon source={iconSource(icons.dropDown)} size={24} modifiers={[rotate(open ? 180 : 0)]} />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      <ExposedDropdownMenu expanded={open} onDismissRequest={() => setExpanded(false)}>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              setExpanded(false);
              if (option.value !== value) onChange(option.value);
            }}>
            <DropdownMenuItem.Text>
              <Text style={{ typography: 'bodyLarge' }}>{option.label}</Text>
            </DropdownMenuItem.Text>
            {option.value === value ? (
              <DropdownMenuItem.TrailingIcon>
                <Icon source={iconSource(icons.check)} size={24} tint={m.primary} contentDescription="已選取" />
              </DropdownMenuItem.TrailingIcon>
            ) : null}
          </DropdownMenuItem>
        ))}
      </ExposedDropdownMenu>
    </ExposedDropdownMenuBox>
  );
}

function SegmentedPicker<T extends string>({ label, value, options, onChange, disabled = false }: PickerRowProps<T>) {
  const inCard = useInCard();
  const { fontScale } = useWindowDimensions();
  const modifiers = [fillMaxWidth(), ...(inCard ? [padding(16, 12, 16, 12)] : [])];
  // The row's width minus the card's padding.
  const available = useContentWidth() - (inCard ? 32 : 0);

  const choose = (next: T) => {
    if (next !== value) onChange(next);
  };
  // Like iOS, the segments show no label, so each one tells TalkBack what it
  // picks (e.g. "顯示：未讀") instead of only its own text.
  const describe = (option: { label: string }) => semantics({ contentDescription: `${label}：${option.label}` });

  if (!segmentsFit(options.map((option) => option.label), available, fontScale)) {
    // Too many or too long for equal segments: single-select filter chips,
    // Material's alternative to an overcrowded segmented button row.
    return (
      <FlowRow horizontalArrangement={{ spacedBy: 8 }} modifiers={modifiers}>
        {options.map((option) => (
          <FilterChip
            key={option.value}
            selected={option.value === value}
            enabled={!disabled}
            onClick={() => choose(option.value)}
            modifiers={[describe(option)]}>
            <FilterChip.Label>
              <Text style={{ typography: 'labelLarge' }}>{option.label}</Text>
            </FilterChip.Label>
            {option.value === value ? (
              <FilterChip.LeadingIcon>
                <Icon source={iconSource(icons.check)} size={18} />
              </FilterChip.LeadingIcon>
            ) : null}
          </FilterChip>
        ))}
      </FlowRow>
    );
  }

  return (
    // SegmentedButton derives its corner shapes from its index among the
    // row's native children, so the buttons must be direct children.
    <SingleChoiceSegmentedButtonRow modifiers={modifiers}>
      {options.map((option) => (
        <SegmentedButton
          key={option.value}
          selected={option.value === value}
          enabled={!disabled}
          onClick={() => choose(option.value)}
          modifiers={[describe(option)]}>
          <SegmentedButton.Label>
            <Text maxLines={1} overflow="ellipsis" style={{ typography: 'labelLarge' }}>
              {option.label}
            </Text>
          </SegmentedButton.Label>
        </SegmentedButton>
      ))}
    </SingleChoiceSegmentedButtonRow>
  );
}

const KEYBOARD_TYPES: Record<NonNullable<TextFieldRowProps['keyboard']>, TextFieldKeyboardType> = {
  default: 'text',
  url: 'uri',
  email: 'email',
  numeric: 'number',
};

export function TextFieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboard = 'default',
  autoFocus = false,
  maxLength,
}: TextFieldRowProps) {
  const inCard = useInCard();
  const { state, onChange } = useSyncedText(value, onChangeText);
  // useSyncedText's state comes from @expo/ui's universal useNativeState,
  // which on Android is the Compose one (State.android.ts); only its
  // universal type is narrower than the Compose field expects.
  const text = state as ObservableState<string>;
  const [focused, setFocused] = useState(false);
  // @expo/ui's Text sets an explicit text style, so the label cannot follow
  // the field's animated LocalTextStyle; pick the resting or floating size.
  const floating = focused || value.length > 0;

  return (
    <OutlinedTextField
      value={text}
      onValueChange={onChange}
      onFocusChanged={setFocused}
      singleLine={!multiline}
      minLines={multiline ? 3 : undefined}
      autoFocus={autoFocus}
      maxLength={maxLength}
      keyboardOptions={{
        keyboardType: KEYBOARD_TYPES[keyboard],
        // Autocorrect only helps prose; it mangles URLs, addresses and numbers.
        autoCorrectEnabled: keyboard === 'default',
        capitalization: 'none',
      }}
      modifiers={[fillMaxWidth(), ...(inCard ? [padding(16, 8, 16, 12)] : [])]}>
      <OutlinedTextField.Label>
        <Text style={{ typography: floating ? 'bodySmall' : 'bodyLarge' }}>{label}</Text>
      </OutlinedTextField.Label>
      {placeholder ? (
        <OutlinedTextField.Placeholder>
          <Text style={{ typography: 'bodyLarge' }}>{placeholder}</Text>
        </OutlinedTextField.Placeholder>
      ) : null}
    </OutlinedTextField>
  );
}

export function FilterChips({ options, onToggle }: FilterChipsProps) {
  const inCard = useInCard();
  return (
    <FlowRow
      horizontalArrangement={{ spacedBy: 8 }}
      modifiers={[fillMaxWidth(), ...(inCard ? [padding(16, 4, 16, 4)] : [])]}>
      {options.map((option) => {
        // Selected chips show Material's check in place of their own icon.
        const leading = option.selected ? icons.check : option.icon;
        return (
          <FilterChip key={option.key} selected={option.selected} onClick={() => onToggle(option.key)}>
            <FilterChip.Label>
              <Text style={{ typography: 'labelLarge' }}>{option.label}</Text>
            </FilterChip.Label>
            {leading ? (
              <FilterChip.LeadingIcon>
                <Icon source={iconSource(leading)} size={18} />
              </FilterChip.LeadingIcon>
            ) : null}
          </FilterChip>
        );
      })}
    </FlowRow>
  );
}
