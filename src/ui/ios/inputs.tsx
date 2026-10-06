import { DatePicker, LabeledContent, Picker, Text, TextField, type TextFieldProps, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityHint,
  accessibilityLabel,
  autocorrectionDisabled,
  datePickerStyle,
  disabled as disabledModifier,
  font,
  id,
  keyboardType,
  labelsHidden,
  lineLimit,
  pickerStyle,
  tag,
  textInputAutocapitalization,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';

import { fromDateKey, toDateKey } from '@/lib/dates';

import type { DateRowProps, PickerRowProps, TextFieldRowProps } from '../types';
import { useSyncedText } from '../use-synced-text';
import { secondaryText, useRowChrome } from './chrome';
import { pickerDate, pickerMinimum, sf } from './helpers';
import { useSnapBack } from './use-snap-back';

/**
 * A single choice: a menu picker row (label, current value and the
 * up/down chevrons) or a segmented control with its label hidden visually
 * (VoiceOver still reads it). The control always shows `value`; see
 * useSnapBack for how a refused choice is undone.
 */
export function PickerRow<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = 'menu',
  icon,
  disabled = false,
}: PickerRowProps<T>) {
  const { identity, choose } = useSnapBack(value, onChange);
  const segmented = variant === 'segmented';
  const chrome = useRowChrome({ flushInPlain: segmented });
  return (
    <Picker<T>
      label={label}
      systemImage={segmented ? undefined : sf(icon)}
      selection={value}
      onSelectionChange={choose}
      modifiers={[
        pickerStyle(segmented ? 'segmented' : 'menu'),
        ...(segmented ? [labelsHidden()] : []),
        disabledModifier(disabled),
        id(identity),
        ...chrome,
      ]}>
      {options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </Picker>
  );
}

const KEYBOARD: Record<NonNullable<TextFieldRowProps['keyboard']>, ModifierConfig[]> = {
  default: [],
  // Addresses must not be capitalised or "corrected" as words.
  url: [keyboardType('url'), textInputAutocapitalization('never'), autocorrectionDisabled()],
  email: [keyboardType('email-address'), textInputAutocapitalization('never'), autocorrectionDisabled()],
  numeric: [keyboardType('numeric')],
};

/**
 * A text field that stays identifiable once filled: single-line fields sit in
 * a LabeledContent (label leading, field after it, like Contacts), multiline
 * fields grow vertically under a caption.
 */
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
  const { state, onChange } = useSyncedText(value, onChangeText);
  // useSyncedText's state comes from @expo/ui's universal useNativeState,
  // which on iOS is the SwiftUI one (src/universal/State.ios.ts re-exports it
  // from @expo/ui/swift-ui); only its universal type is narrower than the
  // SwiftUI field expects.
  const text = state as NonNullable<TextFieldProps['text']>;
  const chrome = useRowChrome();
  const hint = placeholder && placeholder !== label ? [accessibilityHint(placeholder)] : [];
  const field = (
    <TextField
      text={text}
      onTextChange={onChange}
      placeholder={placeholder ?? label}
      axis={multiline ? 'vertical' : 'horizontal'}
      autoFocus={autoFocus}
      maxLength={maxLength}
      modifiers={[
        // The field is named by the label, whatever its placeholder says.
        accessibilityLabel(label),
        ...hint,
        ...KEYBOARD[keyboard],
        ...(multiline ? [lineLimit({ min: 3, max: 8 })] : []),
      ]}
    />
  );

  if (multiline) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={chrome}>
        <Text modifiers={[font({ textStyle: 'caption' }), secondaryText, accessibilityHidden()]}>{label}</Text>
        {field}
      </VStack>
    );
  }
  return (
    <LabeledContent label={label} modifiers={chrome}>
      {field}
    </LabeledContent>
  );
}

/**
 * A compact SwiftUI DatePicker for a local "YYYY-MM-DD" day. Keys become
 * local midnight and picked dates are read back in local time (lib/dates), so
 * the day never shifts with the time zone. `minimumDate` bounds the picker
 * only down to `value` (helpers.pickerMinimum), so it always shows `value`.
 */
export function DateRow({ label, value, onChange, minimumDate }: DateRowProps) {
  const { identity, choose } = useSnapBack(value, onChange);
  const chrome = useRowChrome();
  const minimum = pickerMinimum(value, minimumDate);
  return (
    <DatePicker
      title={label}
      selection={pickerDate(value)}
      range={minimum ? { start: fromDateKey(minimum) } : undefined}
      displayedComponents={['date']}
      onDateChange={(date) => choose(toDateKey(date))}
      modifiers={[datePickerStyle('compact'), id(identity), ...chrome]}
    />
  );
}
