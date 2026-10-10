// 課表: the user's class timetable, one weekday at a time (上午 and 下午, a
// 連堂 as one row) or the whole week as a grid, with the period in session
// marked, each slot opening 編輯課程, plus class switching and re-importing
// from the header menu. Layout per docs/design/native-ui.md, "課表 (Schedule)".
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert } from 'react-native';

import { HeaderActions, type HeaderMenuEntry } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useNow } from '@/features/home/use-now';
import { useTimetableAutofill } from '@/features/home/use-timetable-autofill';
import { gradeOfClass, schoolDayOf, type SchoolCalendarContext } from '@/features/todo/school-days';
import { useSchoolEvents } from '@/features/todo/use-school-events';
import { confirmPickerChange } from '@/hooks/use-confirmed-picker';
import { addDays, formatMonthDayZh, isSameDay } from '@/lib/dates';
import { useScheduleStore } from '@/store/schedule';
import { usePalette } from '@/theme/palette';
import { DayStrip, EmptyState, ListScreen, Loading, Notice, Row, Section, TextBlock, TimetableGrid, type ChoiceOption } from '@/ui';

import {
  classOptions,
  classTimetable,
  defaultDay,
  describeDayParts,
  describeWeek,
  displayedWeek,
  scheduleLoadState,
  scheduleSubtitle,
  type ScheduleLoadState,
} from './schedule-view';
import { WEEKDAY_LABELS, WEEKDAY_SHORT_LABELS, WEEKDAYS, type Timetables, type Weekday } from './timetable';
import { useTimetables } from './use-timetables';

/** The 現在 mark is minute-resolution; the clock only ticks while 課表 is focused. */
const CLOCK_INTERVAL_MS = 30_000;

const LOADING_LABEL = '正在載入課表…';

const EDIT_HINT = '點選課程可修改科目、單雙週輪替、備註與顏色。';

type ScheduleView = 'day' | 'week';

const VIEW_OPTIONS: readonly ChoiceOption<ScheduleView>[] = [
  { label: '日', value: 'day' },
  { label: '週', value: 'week' },
];

export default function ScheduleScreen() {
  const timetable = useTimetables();
  const data = timetable.data;
  const userClass = useScheduleStore((state) => state.userClass);
  // Only whether there are rows: editing a slot re-renders the day rows, not this.
  const hasRows = useScheduleStore((state) => state.rows.length > 0);
  const setClass = useScheduleStore((state) => state.setClass);
  const resetRows = useScheduleStore((state) => state.resetRows);
  const school = useSchoolEvents();
  const [view, setView] = useState<ScheduleView>('day');
  const calendar: SchoolCalendarContext = { events: school.events, term: school.term, grade: gradeOfClass(userClass) };

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
      <HeaderActions
        right={[
          { kind: 'segmented', key: 'view', label: '檢視', options: VIEW_OPTIONS, value: view, onChange: (next) => setView(next as ScheduleView) },
          ...(menu.length > 0 ? [{ kind: 'menu' as const, key: 'schedule', label: '課表選項', icon: icons.more, actions: menu }] : []),
        ]}
      />
      <ListScreen subtitle={scheduleSubtitle(userClass, data?.semesterStart ?? null, new Date())} onRefresh={refresh}>
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

        {view === 'day' ? (
          <DaySections
            timetables={data}
            calendar={calendar}
            state={load.day}
            // While the error notice above offers 重試, a second button would repeat it.
            onReload={load.banner === 'error' ? undefined : () => void refresh()}
          />
        ) : (
          <WeekSection
            timetables={data}
            calendar={calendar}
            state={load.day}
            onReload={load.banner === 'error' ? undefined : () => void refresh()}
          />
        )}
      </ListScreen>
    </>
  );
}

/** The empty state when the class's timetable has not loaded (shared by both views). */
function NotLoaded({ onReload }: { onReload?: () => void }) {
  return (
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

const openEditor = (period: string, day: Weekday) => router.push({ pathname: '/schedule-editor', params: { period, day } });

/** Why there is no school on `date` (國慶日補假…), or null. */
function offReason(date: Date, calendar: SchoolCalendarContext): string | null {
  const day = schoolDayOf(date, calendar);
  return day.kind === 'off' ? day.name : null;
}

/**
 * The week strip and the chosen day's periods, as 上午 and 下午 with a 連堂
 * as one row (it opens its first period; its menu opens each). The minute
 * clock and the chosen day live here, so a tick or a day switch re-renders
 * only these rows, not the header's 80-odd classes.
 */
function DaySections({ timetables, calendar, state, onReload }: {
  timetables: Timetables | undefined;
  calendar: SchoolCalendarContext;
  state: ScheduleLoadState['day'];
  /** The empty state's 重新整理; left out to hide it. */
  onReload?: () => void;
}) {
  const now = useNow(CLOCK_INTERVAL_MS);
  const { scheme } = usePalette();
  const rows = useScheduleStore((store) => store.rows);
  const [day, setDay] = useState<Weekday>(() => defaultDay(new Date()));
  const monday = displayedWeek(now);
  const dates = WEEKDAYS.map((weekday, index) => ({ weekday, date: addDays(monday, index) }));
  const chosen = dates.find((entry) => entry.weekday === day) ?? dates[0];
  const off = offReason(chosen.date, calendar);

  let daySections: ReactElement;
  if (state === 'rows') {
    const parts = describeDayParts({
      rows,
      day,
      periods: timetables?.periods ?? [],
      semesterStart: timetables?.semesterStart ?? null,
      now,
      scheme,
    });
    daySections = (
      <>
        {parts.map((part, index) => (
          <Section
            key={part.key}
            title={part.title || undefined}
            detail={part.detail || undefined}
            footer={index === parts.length - 1 ? EDIT_HINT : undefined}>
            {part.rows.map((row) => {
              const time = [row.time, row.periods.length > 1 ? '連堂' : '', row.untilBell !== null ? `${row.untilBell} 分鐘後下課` : '']
                .filter(Boolean)
                .join(' · ');
              return (
                <Row
                  key={row.periods.join()}
                  title={row.title}
                  subtitle={time || undefined}
                  note={row.subtitle}
                  mark={{ kind: 'period', lines: row.periods, fill: row.fill, ink: row.ink, empty: row.title === '空堂' }}
                  emphasized={row.current}
                  accessibilityLabel={row.accessibilityLabel}
                  onPress={() => openEditor(row.periods[0], day)}
                  actions={
                    row.periods.length > 1
                      ? row.periods.map((period) => ({
                          key: period,
                          label: `編輯第${period}節`,
                          icon: icons.edit,
                          onPress: () => openEditor(period, day),
                        }))
                      : undefined
                  }
                />
              );
            })}
          </Section>
        ))}
      </>
    );
  } else if (state === 'loading') {
    daySections = (
      <Section>
        <Loading label={LOADING_LABEL} />
      </Section>
    );
  } else {
    daySections = <NotLoaded onReload={onReload} />;
  }

  return (
    <>
      <Section plain>
        <DayStrip
          days={dates.map(({ weekday, date }) => {
            const reason = offReason(date, calendar);
            const today = isSameDay(date, now);
            return {
              key: weekday,
              weekday: WEEKDAY_SHORT_LABELS[weekday],
              day: String(date.getDate()),
              isToday: today,
              holiday: reason ? '放假' : undefined,
              accessibilityLabel: [`${WEEKDAY_LABELS[weekday]} ${formatMonthDayZh(date)}`, today ? '今天' : '', reason ?? ''].filter(Boolean).join('，'),
            };
          })}
          selectedKey={day}
          onSelect={(key) => setDay(key as Weekday)}
        />
      </Section>
      {off ? (
        <Section plain>
          <TextBlock text={`${formatMonthDayZh(chosen.date)}${off}，不用上課。`} secondary />
        </Section>
      ) : null}
      {daySections}
    </>
  );
}

/** The displayed week as a grid; days off (from the 行事曆) are dimmed and say 放假. */
function WeekSection({ timetables, calendar, state, onReload }: {
  timetables: Timetables | undefined;
  calendar: SchoolCalendarContext;
  state: ScheduleLoadState['day'];
  onReload?: () => void;
}) {
  const now = useNow(CLOCK_INTERVAL_MS);
  const { scheme } = usePalette();
  const rows = useScheduleStore((store) => store.rows);

  if (state === 'loading') {
    return (
      <Section>
        <Loading label={LOADING_LABEL} />
      </Section>
    );
  }
  if (state === 'empty') return <NotLoaded onReload={onReload} />;

  const week = describeWeek({
    rows,
    periods: timetables?.periods ?? [],
    semesterStart: timetables?.semesterStart ?? null,
    now,
    scheme,
    offDay: (date) => offReason(date, calendar),
  });
  return (
    <Section plain footer={EDIT_HINT.replace('點選課程', '點一格')}>
      <TimetableGrid
        columns={week.columns.map((column) => ({
          key: column.key,
          label: column.label,
          detail: column.date,
          highlighted: column.today,
          holiday: column.off ? '放假' : undefined,
          accessibilityLabel: column.accessibilityLabel,
        }))}
        rows={week.rows}
        cells={week.cells}
        breakAfter={
          week.lunchAfter !== null ? { index: week.lunchAfter, label: week.lunchTime ? `午餐 ${week.lunchTime}` : '午餐' } : undefined
        }
        onPress={(row, column) => openEditor(week.rows[row].key, week.columns[column].key)}
      />
    </Section>
  );
}
