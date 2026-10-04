import { Host, Picker } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ActionButton, Body } from '@/components/ui/page';
import { formatFullDate, fromDateKey } from '@/lib/dates';
import { BRAND, usePalette } from '@/theme/palette';

import { dateKeyFromPicker, datePickerValue } from './date-picker';

export function ChoiceField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Body secondary>{label}</Body>
      <Host matchContents={{ vertical: true }} seedColor={BRAND} colorScheme={palette.scheme} style={{ width: '100%' }} ignoreSafeArea={Platform.OS === 'ios' ? 'all' : undefined}>
        <Picker selectedValue={value} onValueChange={onChange} enabled={!disabled}>
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  minimumDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const palette = usePalette();
  const date = fromDateKey(value);
  const inline = Platform.OS !== 'android';
  return (
    <View style={{ gap: 6 }}>
      <Body secondary>{label}</Body>
      {!inline && <ActionButton label={formatFullDate(date)} onPress={() => setOpen(true)} />}
      {(inline || open) && (
        <DateTimePicker
          value={datePickerValue(value, Platform.OS)}
          mode="date"
          display="compact"
          // Android's selectable-date bounds are normalized from local calendar
          // components by toUtcDayMillis(), unlike the selected value above.
          minimumDate={minimumDate ? fromDateKey(minimumDate) : undefined}
          accentColor={palette.scheme === 'dark' ? '#8EAEFF' : BRAND}
          locale="zh_TW"
          onValueChange={(_event, selected) => {
            onChange(dateKeyFromPicker(selected, Platform.OS));
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
          positiveButton={{ label: '確定' }}
          negativeButton={{ label: '取消' }}
        />
      )}
    </View>
  );
}
