// Changing the user's class. 設定's 我的班級 picker, 課表's 班級 picker and
// 課表's 選擇班級 header submenu all use this, so they offer the same classes
// and ask the same question before replacing the timetable.
import { confirmPickerChange } from '@/lib/confirm-picker-change';
import { useScheduleStore } from '@/store/schedule';

import { classOptions, classTimetable } from './schedule-view';
import type { Timetables } from './timetable';

export function useChangeClass(timetables: Timetables | undefined) {
  const userClass = useScheduleStore((state) => state.userClass);
  const setClass = useScheduleStore((state) => state.setClass);
  // Feed order; a class the feed no longer lists stays first, so the picker
  // can still show it.
  const options = classOptions(timetables?.classIds ?? [], userClass);

  /**
   * Asks, then switches to `next`'s timetable, which replaces every custom
   * subject, note and colour (hence the destructive button). A declined or
   * impossible change leaves userClass alone: PickerRow snaps back to it and
   * the menu's check stays where it was.
   */
  function changeClass(next: string) {
    if (next === userClass) return;
    const rows = classTimetable(timetables, next);
    if (!rows) return;
    confirmPickerChange('更改班級', `改為 ${next} 班會清除目前課表的修改。`, {
      text: '更改',
      style: 'destructive',
      onPress: () => setClass(next, rows),
    });
  }

  return { userClass, options, changeClass };
}
