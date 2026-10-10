// 美食 › 熱食部: the cafeteria's menu image for one school day, paged by week
// from the header and by weekday with the week strip (days off from the
// 行事曆 marked), reloadable past the caches and openable in the browser.
// Layout per docs/design/native-ui.md, "熱食部 (Menu)".
import { Image } from 'expo-image';
import { useState, type ReactElement } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { gradeOfClass, schoolDayOf } from '@/features/todo/school-days';
import { useSchoolEvents } from '@/features/todo/use-school-events';
import { addDays, formatMonthDayZh, fromDateKey, isSameDay } from '@/lib/dates';
import { useScheduleStore } from '@/store/schedule';
import { ButtonRow, DayStrip, Embedded, EmptyState, ListScreen, Loading, Section } from '@/ui';

import { imageAspectRatio, menuDayTitle, shiftWeek, weekRangeLabel } from './menu-view';
import { defaultMenuDay, MENU_DAYS, menuWeekStart, type MenuDay } from './menu-week';
import { useMenuImage } from './use-menu-image';

const ANDROID = process.env.EXPO_OS === 'android';

/**
 * `switcher`: the 美食 tab's 熱食部 / 附近 control, first in the navigation
 * bar (see food/tab.tsx). `date` ("YYYY-MM-DD"): the day to open on, else today.
 */
export default function MenuScreen({ switcher, date }: { switcher?: HeaderItem; date?: string }) {
  const [week, setWeek] = useState(() => menuWeekStart(date ? fromDateKey(date) : new Date()));
  const [day, setDay] = useState<MenuDay>(() => defaultMenuDay(date ? fromDateKey(date) : new Date()));
  const menu = useMenuImage(week, day);
  const dayTitle = menuDayTitle(week, day);
  const school = useSchoolEvents();
  const grade = gradeOfClass(useScheduleStore((state) => state.userClass));
  const calendar = { events: school.events, term: school.term, grade };
  const monday = fromDateKey(week);
  const today = new Date();

  function showThisWeek() {
    // Back to today's menu (Monday's at the weekend), as when the screen opens.
    const now = new Date();
    setWeek(menuWeekStart(now));
    setDay(defaultMenuDay(now));
  }

  function openInBrowser() {
    void Linking.openURL(menu.url).catch(() => Alert.alert('無法開啟菜單', '請稍後再試一次。'));
  }

  const previousWeek = () => setWeek((current) => shiftWeek(current, -1));
  const nextWeek = () => setWeek((current) => shiftWeek(current, 1));
  // iOS: ‹ 本週 › before the title. Android's top app bar has no room for
  // them beside the title and the switch, so they go in a menu there.
  const weekControls: HeaderItem[] = ANDROID
    ? [
        {
          kind: 'menu',
          key: 'week',
          label: '切換週次',
          icon: icons.today,
          actions: [
            { key: 'previous', label: '上一週', icon: icons.chevronLeft, onPress: previousWeek },
            { key: 'this-week', label: '本週', onPress: showThisWeek },
            { key: 'next', label: '下一週', icon: icons.chevronRight, onPress: nextWeek },
          ],
        },
      ]
    : [
        { kind: 'icon', key: 'previous', label: '上一週', icon: icons.chevronLeft, onPress: previousWeek },
        { kind: 'text', key: 'this-week', label: '本週', onPress: showThisWeek },
        { kind: 'icon', key: 'next', label: '下一週', icon: icons.chevronRight, onPress: nextWeek },
      ];

  let content: ReactElement;
  if (menu.status === 'failed') {
    content = (
      <EmptyState
        icon={icons.forkKnife}
        title="這一天的菜單尚未公布，或目前無法讀取。"
        description="可以切換其他日期，或重新整理再試一次。"
        action={{ label: '重新讀取菜單', onPress: () => void menu.refresh() }}
      />
    );
  } else if (menu.image) {
    // Also while a refresh is loading: the pull indicator shows progress.
    content = (
      <Embedded aspectRatio={imageAspectRatio(menu.image.width, menu.image.height)}>
        <Image
          source={menu.image}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel={`${dayTitle} 熱食部菜單`}
        />
      </Embedded>
    );
  } else {
    content = <Loading label="正在讀取菜單…" />;
  }

  return (
    <>
      <HeaderActions
        left={ANDROID ? undefined : weekControls}
        right={[...(switcher ? [switcher] : []), ...(ANDROID ? weekControls : [])]}
      />
      {/* onRefresh from the first render: the iOS List is rebuilt if it appears later. */}
      <ListScreen subtitle={`熱食部 · ${weekRangeLabel(week)}`} onRefresh={menu.refresh}>
        <Section plain>
          <DayStrip
            days={MENU_DAYS.map(({ day: menuDay, label }) => {
              const date = addDays(monday, menuDay - 1);
              const off = schoolDayOf(date, calendar);
              const isToday = isSameDay(date, today);
              return {
                key: `${menuDay}`,
                weekday: label.slice(-1),
                day: String(date.getDate()),
                isToday,
                holiday: off.kind === 'off' ? '放假' : undefined,
                accessibilityLabel: [`${label} ${formatMonthDayZh(date)}`, isToday ? '今天' : '', off.kind === 'off' ? off.name : '']
                  .filter(Boolean)
                  .join('，'),
              };
            })}
            selectedKey={`${day}`}
            onSelect={(key) => setDay(Number(key) as MenuDay)}
          />
        </Section>

        {/* A full empty state sits without the card, as elsewhere in the kit. */}
        <Section title={dayTitle} plain={menu.status === 'failed'}>
          {content}
        </Section>

        <Section>
          <ButtonRow label="在瀏覽器開啟菜單" icon={icons.openExternal} onPress={openInBrowser} />
        </Section>
      </ListScreen>
    </>
  );
}

const styles = StyleSheet.create({
  image: { flex: 1 },
});
