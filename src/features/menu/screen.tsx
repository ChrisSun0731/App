// 美食 › 熱食部: the cafeteria's menu for one school day, paged by week from
// the header and by weekday with the week strip (days off from the 行事曆
// marked). A week without dish data shows a paper menu card fitted above
// the tab bar, with the original image a tap away. Large text keeps the
// full-width menu and scrolls. Layout per docs/design/native-ui.md.
import { useState, type ReactElement } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { eventsOn, gradeOfClass, isDayOff, nextSchoolDay, schoolDayOf } from '@/features/todo/school-days';
import { useSchoolEvents } from '@/features/todo/use-school-events';
import { addDays, formatMonthDayZh, fromDateKey, isSameDay, toDateKey } from '@/lib/dates';
import { openWebsite } from '@/lib/open-link';
import { useScheduleStore } from '@/store/schedule';
import { ButtonRow, DayStrip, Embedded, EmptyState, ListScreen, Row, Section, useAccessibilityTextSize } from '@/ui';

import { formatPrice, menuGroups, menuItemLabel, menuItems, type MenuItem } from './menu-data';
import { MenuPicture } from './menu-picture';
import { isMenuTemplate, MENU_BAND_RATIO, MENU_MAX_HEIGHT, menuDayTitle, menuFitFloor, shiftWeek, weekRangeLabel } from './menu-view';
import { defaultMenuDay, MENU_DAYS, menuImageUrl, menuWeekStart, type MenuDay } from './menu-week';
import { useMenuImage } from './use-menu-image';
import { useMenuWeek } from './use-menu-week';

const ANDROID = process.env.EXPO_OS === 'android';

/**
 * `switcher`: the 美食 tab's 熱食部 / 附近 control, first in the navigation
 * bar (see food/tab.tsx). `date` ("YYYY-MM-DD"): the day to open on, else today.
 */
export default function MenuScreen({ switcher, date }: { switcher?: HeaderItem; date?: string }) {
  const [week, setWeek] = useState(() => menuWeekStart(date ? fromDateKey(date) : new Date()));
  const [day, setDay] = useState<MenuDay>(() => defaultMenuDay(date ? fromDateKey(date) : new Date()));
  const menuWeek = useMenuWeek(week);
  const items = menuWeek.data ? menuItems(menuWeek.data, day) : undefined;
  // The image only when the week's dishes are not published or cannot be read
  // (offline the query waits, so the image's own timeout ends that too).
  const imageMode = items === undefined && (menuWeek.isError || menuWeek.fetchStatus === 'paused');
  const dayTitle = menuDayTitle(week, day);
  const school = useSchoolEvents();
  const grade = gradeOfClass(useScheduleStore((state) => state.userClass));
  const calendar = { events: school.events, term: school.term, grade };
  const monday = fromDateKey(week);
  const today = new Date();
  const selected = addDays(monday, day - 1);
  const chosen = schoolDayOf(selected, calendar);
  // Only an explicit holiday suppresses a picture; the current term's bounds
  // cannot tell us whether a historical menu date had school.
  const holiday = eventsOn(toDateKey(selected), school.events).find(isDayOff);
  const menu = useMenuImage(week, day, imageMode && !holiday);
  const largeText = useAccessibilityTextSize();
  const { fontScale } = useWindowDimensions();
  const next = chosen.kind === 'off' ? nextSchoolDay(selected, calendar, 14) : null;
  const nextAction = next ? { label: `看 ${formatMonthDayZh(next)} 的菜單`, onPress: () => showDay(next) } : undefined;

  function showDay(value: Date) {
    setWeek(menuWeekStart(value));
    setDay(defaultMenuDay(value));
    AccessibilityInfo.announceForAccessibility(menuDayTitle(menuWeekStart(value), defaultMenuDay(value)));
  }

  function showWeek(value: string) {
    setWeek(value);
    AccessibilityInfo.announceForAccessibility(`熱食部，${weekRangeLabel(value)}`);
  }

  function showThisWeek() {
    // Back to today's menu (Monday's at the weekend), as when the screen opens.
    const now = new Date();
    showWeek(menuWeekStart(now));
    setDay(defaultMenuDay(now));
  }

  function openInBrowser() {
    void openWebsite(imageMode ? menu.url : menuImageUrl(week, day));
  }

  // Pull to refresh reloads what is shown: the week's dishes, or the image.
  const refresh = () => (imageMode ? menu.refresh() : menuWeek.refetch());

  const previousWeek = () => showWeek(shiftWeek(week, -1));
  const nextWeek = () => showWeek(shiftWeek(week, 1));
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
        // The chevrons pair as a stepper; the text button sits apart from them.
        { kind: 'icon', key: 'previous', label: '上一週', icon: icons.chevronLeft, onPress: previousWeek },
        { kind: 'icon', key: 'next', label: '下一週', icon: icons.chevronRight, onPress: nextWeek },
        { kind: 'space', key: 'gap' },
        { kind: 'text', key: 'this-week', label: '本週', onPress: showThisWeek },
      ];

  let content: ReactElement;
  if (items !== undefined && items.length > 0) {
    content = (
      <>
        {menuGroups(items).map((group, index) => (
          <Section key={group[0].number} tight>
            {group.map((item, row) => (
              <DishRow key={item.number} item={item} spoken={index === 0 && row === 0 ? `${dayTitle}，${items.length} 道，${menuItemLabel(item)}` : undefined} />
            ))}
          </Section>
        ))}
        <Section tight>
          <ButtonRow label="查看原始菜單圖片" icon={icons.openExternal} onPress={openInBrowser} />
        </Section>
      </>
    );
  } else if (items !== undefined) {
    // A full empty state sits without the card, as elsewhere in the kit.
    content = (
      <Section plain tight>
        {chosen.kind === 'off' ? (
          <EmptyState icon={icons.forkKnife} title={chosen.name} description="這天放假，熱食部沒有供餐。" action={nextAction} />
        ) : (
          <EmptyState icon={icons.forkKnife} title="這天沒有菜單" description="熱食部沒有公布這天的菜色，可以切換其他日期。" />
        )}
      </Section>
    );
  } else if (imageMode && holiday) {
    content = (
      <Section plain tight>
        <EmptyState icon={icons.forkKnife} title={holiday.title} description="這天放假，熱食部沒有供餐。" action={nextAction} />
      </Section>
    );
  } else if (imageMode && menu.status === 'failed') {
    content = (
      <Section plain tight>
        <EmptyState
          icon={icons.forkKnife}
          title="這一天的菜單尚未公布，或目前無法讀取。"
          description="可以切換其他日期，或重新整理再試一次。"
          action={{ label: '重新讀取菜單', onPress: () => void menu.refresh() }}
        />
      </Section>
    );
  } else {
    const image = imageMode ? menu.image : null;
    const ratio = image && !isMenuTemplate(image.width, image.height) ? image.width / image.height : MENU_BAND_RATIO;
    content = (
      <Section tight>
        <Embedded
          fit="screen"
          aspectRatio={ratio}
          minHeight={largeText ? Infinity : menuFitFloor(fontScale)}
          maxHeight={MENU_MAX_HEIGHT}
          onPress={image ? openInBrowser : undefined}
          accessibilityLabel={`${dayTitle} 熱食部菜單`}
          accessibilityHint="開啟原始圖片，可放大檢視">
          <MenuPicture image={image} />
        </Embedded>
      </Section>
    );
  }

  return (
    <>
      <HeaderActions
        left={ANDROID ? undefined : weekControls}
        right={[...(switcher ? [switcher] : []), ...(ANDROID ? weekControls : [])]}
      />
      {/* onRefresh from the first render: the iOS List is rebuilt if it appears later. */}
      <ListScreen subtitle={`熱食部 · ${weekRangeLabel(week)}`} onRefresh={refresh}>
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

        {content}
      </ListScreen>
    </>
  );
}

/** One dish as on the printed menu: its 項次, its name and the price. */
function DishRow({ item, spoken }: { item: MenuItem; spoken?: string }) {
  return (
    <Row
      title={item.name}
      mark={{ kind: 'index', text: String(item.number) }}
      detail={formatPrice(item.price) || undefined}
      detailProminent
      accessibilityLabel={spoken ?? menuItemLabel(item)}
    />
  );
}
