// 課表: the user's class timetable one weekday at a time, with the period in
// session marked 目前, each slot opening 編輯課程, plus class switching and
// re-importing. Layout per docs/design/native-ui.md, "課表 (Schedule)".
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert } from 'react-native';

import { HeaderActions, type HeaderMenuEntry } from '@/components/header-actions';
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
  scheduleLoadState,
  type ScheduleLoadState,
} from './schedule-view';
import { WEEKDAY_LABELS, type Timetables, type Weekday } from './timetable';
import { useTimetables } from './use-timetables';

/** The 目前 mark is minute-resolution; the clock only ticks while 課表 is focused. */
const CLOCK_INTERVAL_MS = 30_000;

const LOADING_LABEL = '正在載入課表…';

export default function ScheduleScreen() {
  const timetable = useTimetables();
  const data = timetable.data;
  const userClass = useScheduleStore((state) => state.userClass);
  // Only whether there are rows: editing a slot re-renders the day rows, not this.
  const hasRows = useScheduleStore((state) => state.rows.length > 0);
  const setClass = useScheduleStore((state) => state.setClass);
  const resetRows = useScheduleStore((state) => state.resetRows);

  useTimetableAutofill(data?.byClass);

  const original = classTimetable(data, userClass);
  const options = classOptions(data?.classIds ?? [], userClass);
  const load = scheduleLoadState({
    hasRows,
    isPending: timetable.isPending,
    isFetching: timetable.isFetching,
    isError: timetable.isError,
  });

  const refresh = () => timetable.refetch();

  // Shared by the 班級 picker and the header's 選擇班級 submenu. Both show
  // userClass, so a declined or impossible change leaves the picker snapping
  // back and the menu's check where it was.
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

  // The 80-odd classes sit in a submenu so they do not bury 重新匯入課表;
  // both wait for the timetables, as the picker and button below do.
  const menu: HeaderMenuEntry[] = [];
  if (data) {
    menu.push({
      kind: 'submenu',
      key: 'class',
      label: '選擇班級',
      icon: icons.school,
      actions: options.map((option) => ({
        key: option.value,
        label: option.label,
        selected: option.value === userClass,
        onPress: () => changeClass(option.value),
      })),
    });
  }
  if (original) {
    menu.push({ key: 'reimport', label: '重新匯入課表', icon: icons.restore, onPress: confirmReimport });
  }

  return (
    <>
      {menu.length > 0 ? (
        <HeaderActions right={[{ kind: 'menu', key: 'schedule', label: '課表選項', icon: icons.more, actions: menu }]} />
      ) : null}
      <ListScreen onRefresh={refresh}>
        {load.banner !== 'none' ? (
          <Section>
            {load.banner === 'error' ? (
              <Notice
                tone="error"
                title="暫時無法更新課表"
                message="可下拉重試。"
                action={{ label: '重試', onPress: () => void refresh() }}
              />
            ) : (
              <Loading label={LOADING_LABEL} />
            )}
          </Section>
        ) : null}

        <DaySections
          timetables={data}
          userClass={userClass}
          state={load.day}
          // While the error notice above offers 重試, a second button would repeat it.
          onReload={load.banner === 'error' ? undefined : () => void refresh()}
        />

        <Section title="班級">
          <PickerRow label="班級" value={userClass} options={options} onChange={changeClass} disabled={!data} />
          <ButtonRow label="重新匯入課表" onPress={confirmReimport} disabled={!original} />
        </Section>
      </ListScreen>
    </>
  );
}

/**
 * The 一–五 picker and the chosen day's periods. The minute clock and the
 * chosen day live here, so a tick or a day switch re-renders only these rows,
 * not the 班級 picker's 80-odd options or the header.
 */
function DaySections({ timetables, userClass, state, onReload }: {
  timetables: Timetables | undefined;
  userClass: string;
  state: ScheduleLoadState['day'];
  /** The empty state's 重新整理; left out to hide it. */
  onReload?: () => void;
}) {
  const now = useNow(CLOCK_INTERVAL_MS);
  const { scheme } = usePalette();
  const rows = useScheduleStore((store) => store.rows);
  const [day, setDay] = useState<Weekday>(() => defaultDay(new Date()));

  const weekInfo = formatWeekInfo(timetables?.academicYear ?? '', timetables?.semesterStart ?? null, now);
  // The class is named next to the rows: the 班級 section is below the fold.
  const title = `${WEEKDAY_LABELS[day]} · ${userClass} 班`;

  let daySection: ReactElement;
  if (state === 'rows') {
    const periodRows = describeDay({
      rows,
      day,
      periods: timetables?.periods ?? [],
      semesterStart: timetables?.semesterStart ?? null,
      now,
      scheme,
    });
    daySection = (
      <Section title={title} footer={`${weekInfo}\n點選課程可修改科目、單雙週輪替、備註與顏色。`}>
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
  } else if (state === 'loading') {
    daySection = (
      <Section title={title} footer={weekInfo}>
        <Loading label={LOADING_LABEL} />
      </Section>
    );
  } else {
    daySection = (
      <Section plain>
        <EmptyState
          icon={icons.book}
          title="此班級課表尚未載入"
          description="請選擇班級或重新整理。"
          action={onReload ? { label: '重新整理', onPress: onReload } : undefined}
        />
      </Section>
    );
  }

  return (
    <>
      <Section plain>
        <PickerRow variant="segmented" label="星期" value={day} options={DAY_OPTIONS} onChange={setDay} />
      </Section>
      {daySection}
    </>
  );
}
