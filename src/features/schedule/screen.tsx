// 課表: the user's class timetable one weekday at a time, with the period in
// session marked 目前, each slot opening 編輯課程, plus class switching and
// re-importing. Layout per docs/design/native-ui.md, "課表 (Schedule)".
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert } from 'react-native';

import { HeaderActions, type HeaderMenuAction } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useNow } from '@/features/home/use-now';
import { useTimetableAutofill } from '@/features/home/use-timetable-autofill';
import { confirmPickerChange } from '@/hooks/use-confirmed-picker';
import { useScheduleStore } from '@/store/schedule';
import { usePalette } from '@/theme/palette';
import { ButtonRow, EmptyState, ListScreen, Loading, Notice, PickerRow, Row, Section } from '@/ui';

import {
  classOptions,
  classTimetable,
  DAY_OPTIONS,
  defaultDay,
  describeDay,
  formatWeekInfo,
} from './schedule-view';
import { WEEKDAY_LABELS, type Weekday } from './timetable';
import { useTimetables } from './use-timetables';

/** The 目前 mark is minute-resolution; the clock only ticks while 課表 is focused. */
const CLOCK_INTERVAL_MS = 30_000;

export default function ScheduleScreen() {
  const now = useNow(CLOCK_INTERVAL_MS);
  const { scheme } = usePalette();
  const timetable = useTimetables();
  const data = timetable.data;
  const userClass = useScheduleStore((state) => state.userClass);
  const rows = useScheduleStore((state) => state.rows);
  const setClass = useScheduleStore((state) => state.setClass);
  const resetRows = useScheduleStore((state) => state.resetRows);
  const [day, setDay] = useState<Weekday>(() => defaultDay(new Date()));

  useTimetableAutofill(data?.byClass);

  const original = classTimetable(data, userClass);
  const options = classOptions(data?.classIds ?? [], userClass);
  const weekInfo = formatWeekInfo(data?.academicYear ?? '', data?.semesterStart ?? null, now);
  const periodRows = describeDay({
    rows,
    day,
    periods: data?.periods ?? [],
    semesterStart: data?.semesterStart ?? null,
    now,
    scheme,
  });

  const refresh = () => timetable.refetch();

  function changeClass(next: string) {
    if (next === userClass) return;
    const nextRows = classTimetable(data, next);
    // Nothing to switch to. PickerRow always shows `value`, so leaving
    // userClass alone puts the picker back on it.
    if (!nextRows) return;
    confirmPickerChange(
      '更改班級',
      `改為 ${next} 班會清除目前課表的修改。`,
      { text: '更改', style: 'destructive', onPress: () => setClass(next, nextRows) },
      // Declined: userClass is unchanged and PickerRow snaps back to it.
      () => {},
    );
  }

  function confirmReimport() {
    if (!original) return;
    Alert.alert('重新匯入課表', '將清除所有科目、備註和顏色修改。', [
      { text: '取消', style: 'cancel' },
      { text: '重新匯入', style: 'destructive', onPress: () => resetRows(original) },
    ]);
  }

  // The header menu: 重新匯入課表, then every class as a checkable item (the
  // class picker; HeaderActions menus are flat). Both need the timetables.
  const menu: HeaderMenuAction[] = [];
  if (original) {
    menu.push({ key: 'reimport', label: '重新匯入課表', icon: icons.restore, onPress: confirmReimport });
  }
  if (data) {
    for (const option of options) {
      menu.push({
        key: `class-${option.value}`,
        label: option.label,
        selected: option.value === userClass,
        onPress: () => changeClass(option.value),
      });
    }
  }

  let daySection: ReactElement;
  if (rows.length > 0) {
    daySection = (
      <Section title={WEEKDAY_LABELS[day]} footer={weekInfo}>
        {periodRows.map((row) => (
          <Row
            key={row.period}
            overline={row.overline}
            title={row.title}
            subtitle={row.subtitle}
            background={row.background}
            emphasized={row.current}
            badge={row.current ? '目前' : undefined}
            accessory="chevron"
            accessibilityLabel={row.accessibilityLabel}
            onPress={() => router.push({ pathname: '/schedule-editor', params: { period: row.period, day } })}
          />
        ))}
      </Section>
    );
  } else if (timetable.isPending) {
    daySection = (
      <Section title={WEEKDAY_LABELS[day]} footer={weekInfo}>
        <Loading label="正在載入課表…" />
      </Section>
    );
  } else {
    daySection = (
      <Section plain>
        <EmptyState
          icon={icons.book}
          title="此班級課表尚未載入"
          description="請選擇班級或重新整理。"
          // While the error notice above offers 重試, a second button would repeat it.
          action={timetable.isError ? undefined : { label: '重新整理', onPress: () => void refresh() }}
        />
      </Section>
    );
  }

  return (
    <>
      {menu.length > 0 ? (
        <HeaderActions right={[{ kind: 'menu', key: 'schedule', label: '課表選項', icon: icons.more, actions: menu }]} />
      ) : null}
      <ListScreen onRefresh={refresh}>
        {timetable.isError ? (
          <Section>
            <Notice
              tone="error"
              title="暫時無法更新課表"
              message="可下拉重試。"
              action={{ label: '重試', onPress: () => void refresh() }}
            />
          </Section>
        ) : null}

        <Section plain>
          <PickerRow variant="segmented" label="星期" value={day} options={DAY_OPTIONS} onChange={setDay} />
        </Section>

        {daySection}

        <Section title="班級" footer="點選課程可修改科目、備註與顏色。">
          <PickerRow label="班級" value={userClass} options={options} onChange={changeClass} disabled={!data} />
          <ButtonRow label="重新匯入課表" onPress={confirmReimport} disabled={!original} />
        </Section>
      </ListScreen>
    </>
  );
}
