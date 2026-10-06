// 熱食部: the cafeteria's menu image for one school day, paged by week from the
// header and by weekday with a segmented control, reloadable past the caches
// and openable in the browser. Layout per docs/design/native-ui.md,
// "熱食部 (Menu)".
import { Image } from 'expo-image';
import { useState, type ReactElement } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { ButtonRow, Embedded, EmptyState, ListScreen, Loading, PickerRow, Section } from '@/ui';

import {
  DAY_OPTIONS,
  imageAspectRatio,
  menuDayTitle,
  shiftWeek,
  toMenuDay,
  weekRangeLabel,
} from './menu-view';
import { defaultMenuDay, menuWeekStart, type MenuDay } from './menu-week';
import { useMenuImage } from './use-menu-image';

export default function MenuScreen() {
  const [week, setWeek] = useState(() => menuWeekStart(new Date()));
  const [day, setDay] = useState<MenuDay>(() => defaultMenuDay(new Date()));
  const menu = useMenuImage(week, day);
  const dayTitle = menuDayTitle(week, day);

  function showThisWeek() {
    // Back to today's menu (Monday's at the weekend), as when the screen opens.
    const now = new Date();
    setWeek(menuWeekStart(now));
    setDay(defaultMenuDay(now));
  }

  function openInBrowser() {
    void Linking.openURL(menu.url).catch(() => Alert.alert('無法開啟菜單', '請稍後再試一次。'));
  }

  const header: HeaderItem[] = [
    {
      kind: 'icon',
      key: 'previous',
      label: '上一週',
      icon: icons.chevronLeft,
      onPress: () => setWeek((current) => shiftWeek(current, -1)),
    },
    { kind: 'text', key: 'this-week', label: '本週', onPress: showThisWeek },
    {
      kind: 'icon',
      key: 'next',
      label: '下一週',
      icon: icons.chevronRight,
      onPress: () => setWeek((current) => shiftWeek(current, 1)),
    },
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
      <HeaderActions right={header} />
      {/* onRefresh from the first render: the iOS List is rebuilt if it appears later. */}
      <ListScreen onRefresh={menu.refresh}>
        <Section plain title={weekRangeLabel(week)}>
          <PickerRow
            variant="segmented"
            label="星期"
            value={`${day}`}
            options={DAY_OPTIONS}
            onChange={(value) => setDay(toMenuDay(value))}
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
