// 校網: the school website's 重要公告 and 最新消息, with 未讀 / 已釘選 / 已讀 /
// 全部 filters, header search, pins and paging. Layout per
// docs/design/native-ui.md, "校網 (News)". The cached list shows offline.
import { Stack } from 'expo-router';
import { useState, type ReactElement } from 'react';

import { HeaderActions, type HeaderMenuAction } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useNewsStore } from '@/store/news';
import { usePalette } from '@/theme/palette';
import { ButtonRow, ListScreen, Loading, Notice, PickerRow, Row, Section, TextBlock } from '@/ui';

import { confirmMarkAllRead, openNews, shareNews, togglePin } from './news-actions';
import {
  emptyMessage,
  formatNewsTime,
  groupNews,
  lastUpdatedFooter,
  NEWS_FILTERS,
  PAGE_SIZE,
  partialFailureTitle,
  searchNews,
  showMoreLabel,
  type NewsFilter,
} from './news-view';
import type { NewsItem } from './rss';
import { useSchoolNews } from './use-school-news';

const ANDROID = process.env.EXPO_OS === 'android';

export default function NewsScreen() {
  const palette = usePalette();
  const { query, failedFeeds } = useSchoolNews();
  const pinned = useNewsStore((state) => state.pinned);
  const cached = useNewsStore((state) => state.cached);
  const lastClearedTime = useNewsStore((state) => state.lastClearedTime);
  const lastFetchTime = useNewsStore((state) => state.lastFetchTime);
  const restoreAll = useNewsStore((state) => state.restoreAll);
  // Neither is persisted, as before: the screen opens on 未讀 without a search.
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<NewsFilter>('unread');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetched = query.data ?? cached;
  const groups = groupNews(fetched, pinned, lastClearedTime);
  const shown = searchNews(groups[filter], search);
  const pinnedTitles = new Set(pinned.map((item) => item.title));
  // Joins a refresh already under way (a poll, a pull) instead of restarting it.
  const refresh = () => query.refetch({ cancelRefetch: false });

  function changeSearch(text: string) {
    setSearch(text);
    setVisibleCount(PAGE_SIZE);
  }

  function changeFilter(value: NewsFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  // Header menu items cannot be disabled, so ones with nothing to do are left
  // out (they were disabled buttons before).
  const menu: HeaderMenuAction[] = [];
  if (groups.unread.length > 0) {
    menu.push({ key: 'read', label: '已讀所有訊息', icon: icons.markRead, onPress: confirmMarkAllRead });
  }
  if (lastClearedTime !== null) {
    menu.push({ key: 'restore', label: '恢復已讀訊息', icon: icons.restore, onPress: restoreAll });
  }
  menu.push({ key: 'refresh', label: '重新整理', icon: icons.refresh, onPress: () => void refresh() });

  function renderRow(item: NewsItem): ReactElement {
    const isPinned = pinnedTitles.has(item.title);
    return (
      <Row
        key={item.title}
        title={item.title}
        titleLines={3}
        subtitle={formatNewsTime(item.pubDate)}
        overline={isPinned ? '已釘選' : undefined}
        accessory="external"
        onPress={() => void openNews(item)}
        // The toggle is the row's 釘選 / 取消釘選 action: iOS lists it in the
        // context menu and as a leading swipe, Android shows it as an icon button.
        toggle={{
          label: isPinned ? '取消釘選' : '釘選',
          icon: icons.pin,
          activeIcon: icons.pinFilled,
          active: isPinned,
          onPress: () => togglePin(item, isPinned),
        }}
        actions={[
          { key: 'open', label: '開啟公告', icon: icons.openExternal, onPress: () => void openNews(item) },
          { key: 'share', label: '分享', icon: icons.share, onPress: () => void shareNews(item) },
        ]}
      />
    );
  }

  // Status above the list: a failed refresh keeps showing what was saved.
  let status: ReactElement | null = null;
  if (query.isError) {
    status = fetched.length > 0 ? (
      <Notice
        tone="error"
        title="校網目前無法更新"
        message="先顯示上次儲存的消息。"
        action={{ label: '重試', onPress: () => void refresh() }}
      />
    ) : (
      <Notice
        tone="error"
        title="無法讀取校網消息"
        message="請檢查網路後重試。"
        action={{ label: '重試', onPress: () => void refresh() }}
      />
    );
  } else if (failedFeeds.length > 0) {
    status = (
      <Notice
        tone="error"
        title={partialFailureTitle(failedFeeds)}
        message="先顯示上次儲存的內容。"
        action={{ label: '重試', onPress: () => void refresh() }}
      />
    );
  }

  // The first load, with nothing cached to show meanwhile.
  const loading = query.isPending && query.isFetching;
  // Until something has loaded, an empty filter is not news: the loading
  // indicator or the error notice says what is going on instead. (Pinned
  // items are saved, so 已釘選 can still list them.)
  const showList = shown.length > 0 || !(loading || (query.isError && fetched.length === 0));

  return (
    <>
      <Stack.SearchBar
        placeholder="搜尋消息"
        // The SwiftUI list inside the Host does not drive UIKit's
        // hide-on-scroll, which could leave the bar unreachable.
        hideWhenScrolling={false}
        // Results filter as you type, so keep them visible and tappable.
        obscureBackground={false}
        onChangeText={(event) => changeSearch(event.nativeEvent.text)}
        // iOS clears the field on 取消 without a change event; Android
        // clears it when the search view collapses.
        onCancelButtonPress={() => changeSearch('')}
        onClose={() => changeSearch('')}
        // Android's search view takes the top app bar's colours, like the
        // HeaderActions icons beside it (iOS draws system colours itself).
        {...(ANDROID
          ? { textColor: palette.text, hintTextColor: palette.textSecondary, headerIconColor: palette.textSecondary }
          : null)}
      />
      <HeaderActions right={[{ kind: 'menu', key: 'more', label: '更多', icon: icons.more, actions: menu }]} />
      <ListScreen onRefresh={refresh}>
        {status ? <Section key="status">{status}</Section> : null}

        <Section key="filter" plain>
          <PickerRow
            label="篩選消息"
            variant="segmented"
            value={filter}
            options={NEWS_FILTERS}
            onChange={changeFilter}
          />
        </Section>

        {loading ? (
          <Section key="loading">
            <Loading label="正在讀取校網消息…" />
          </Section>
        ) : null}

        {showList ? (
          <Section key="list" title={`${shown.length} 則消息`} footer={lastUpdatedFooter(lastFetchTime)}>
            {shown.length === 0 ? <TextBlock text={emptyMessage(filter, search)} secondary /> : null}
            {shown.slice(0, visibleCount).map(renderRow)}
            {shown.length > visibleCount ? (
              <ButtonRow
                label={showMoreLabel(shown.length - visibleCount)}
                onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
              />
            ) : null}
          </Section>
        ) : null}
      </ListScreen>
    </>
  );
}
