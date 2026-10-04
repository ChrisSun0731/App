import { fromDateKey, toDateKey } from '@/lib/dates';

/** Material's date picker represents calendar dates at UTC midnight. */
export function datePickerValue(dateKey: string, platform: string): Date {
  const local = fromDateKey(dateKey);
  return platform === 'android' ? new Date(`${dateKey}T00:00:00Z`) : local;
}

export function dateKeyFromPicker(date: Date, platform: string): string {
  return platform === 'android' ? date.toISOString().slice(0, 10) : toDateKey(date);
}
