// 校網: the school website's 重要公告 and 最新消息, with 未讀 / 已釘選 / 已讀 /
// 全部 filters, header search, pins and paging. Layout per
// docs/design/native-ui.md, "校網 (News)". The cached list shows offline.
import { Stack } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { RETRY } from '@/lib/copy';
import { useHeaderSearch } from '@/navigation/use-header-search';
import { useNewsStore } from '@/store/news';
import { ButtonRow, ListScreen, Loading, Notice, PickerRow, Row, Section, TextBlock } from '@/ui';

import { confirmMarkAllRead, openNews, shareNews, togglePin } from './news-actions';
import {
  emptyMessage,
  formatNewsTime,
  groupNews,
  lastUpdatedFooter,
  NEWS_FILTERS,
  PAGE_SIZE,
  partialFailureMessage,
  partialFailureTitle,
  searchNews,
  showMoreLabel,
  type NewsFilter,
} from './news-view';
import type { NewsItem } from './rss';
import { useSchoolNews } from './use-school-news';

const ANDROID = process.env.EXPO_OS === 'android';

// iOS keeps 釘選 in the leading swipe and the long-press menu, and 分享 in the
// trailing swipe and that menu, none of which shows on screen (an unpinned
// row draws no pin); Android shows a pin button and an overflow button.
const NEWS_HINT = ANDROID ? '' : '右滑或長按消息即可釘選，長按可分享。';

// Android's row ends in two 48dp icon buttons (pin, overflow), leaving the
// title about 11 CJK characters per line on a 360dp phone, so it gets more
// lines to fit a typical 35-45 character title. iOS fits ~45 in three.
const TITLE_LINES = ANDROID ? 5 : 3;

export default function NewsScreen() {
  const { query, partialFailure, refetch, refresh, refreshing } = useSchoolNews();
  const pinned = useNewsStore((state) => state.pinned);
  const cached = useNewsStore((state) => state.cached);
  const lastClearedTime = useNewsStore((state) => state.lastClearedTime);
  const lastFetchTime = useNewsStore((state) => state.lastFetchTime);
  const restoreAll = useNewsStore((state) => state.restoreAll);
  // Neither is persisted, as before: the screen opens on 未讀 without a search.
  const [filter, setFilter] = useState<NewsFilter>('unread');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // A new search pages back to the start. Stable, as useHeaderSearch asks.
  const resetPaging = useCallback(() => setVisibleCount(PAGE_SIZE), []);
  const { query: search, searchBarProps } = useHeaderSearch(resetPaging);

  const fetched = query.data ?? cached;
  const groups = useMemo(() => groupNews(fetched, pinned, lastClearedTime), [fetched, pinned, lastClearedTime]);
  const shown = searchNews(groups[filter], search);
  const pinnedTitles = new Set(pinned.map((item) => item.title));

  function changeFilter(value: NewsFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  // Items with nothing to do are greyed, as the buttons they replace were.
  const menu = [
    {
      key: 'read',
      label: '已讀所有訊息',
      icon: icons.markRead,
      disabled: groups.unread.length === 0,
      onPress: confirmMarkAllRead,
    },
    {
      key: 'restore',
      label: '恢復已讀訊息',
      icon: icons.restore,
      disabled: lastClearedTime === null,
      onPress: restoreAll,
    },
    { key: 'refresh', label: '重新整理', icon: icons.refresh, onPress: () => void refresh() },
  ];

  function renderRow(item: NewsItem): ReactElement {
    const isPinned = pinnedTitles.has(item.title);
    return (
      <Row
        key={item.title}
        title={item.title}
        titleLines={TITLE_LINES}
        subtitle={formatNewsTime(item.pubDate)}
        overline={isPinned ? '已釘選' : undefined}
        // Android's overflow already offers 開啟公告; a third trailing icon
        // would squeeze the title further.
        accessory={ANDROID ? 'none' : 'external'}
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

  // The first load, with nothing cached to show meanwhile.
  const loading = query.isPending && query.isFetching;

  // Status above the list: a failed refresh keeps showing what was saved.
  let status: ReactElement | null = null;
  if (refreshing && !loading) {
    // 重新整理 or 重試 is running. Replaces a notice that would otherwise sit
    // unchanged for the whole fetch, as if the tap had done nothing.
    status = <Loading label={fetched.length > 0 ? '正在重新整理…' : '正在讀取校網消息…'} />;
  } else if (query.isError) {
    status = fetched.length > 0 ? (
      <Notice
        tone="error"
        title="校網目前無法更新"
        message="先顯示上次儲存的消息。"
        action={{ label: RETRY, onPress: () => void refresh() }}
      />
    ) : (
      <Notice
        tone="error"
        title="無法讀取校網消息"
        message="請檢查網路後重試。"
        action={{ label: RETRY, onPress: () => void refresh() }}
      />
    );
  } else if (partialFailure) {
    status = (
      <Notice
        tone="error"
        title={partialFailureTitle(partialFailure.feeds)}
        message={partialFailureMessage(partialFailure.showingCached)}
        action={{ label: RETRY, onPress: () => void refresh() }}
      />
    );
  }

  // Until something has loaded, an empty filter is not news: the loading
  // indicator or the error notice says what is going on instead. (Pinned
  // items are saved, so 已釘選 can still list them.)
  const showList = shown.length > 0 || !(loading || (query.isError && fetched.length === 0));

  return (
    <>
      <Stack.SearchBar placeholder="搜尋消息" {...searchBarProps} />
      <HeaderActions right={[{ kind: 'menu', key: 'more', label: '更多', icon: icons.more, actions: menu }]} />
      <ListScreen
        // Pull to refresh draws its own indicator, so it skips `refreshing`.
        // Nor does the list get the kit's `refreshing`: the status row
        // already shows 重新整理 / 重試 running, labelled and in place of the
        // notice whose 重試 started it, and a second spinner would repeat it.
        onRefresh={refetch}>
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
          <Section
            key="list"
            title={`${shown.length} 則消息`}
            footer={[lastUpdatedFooter(lastFetchTime), NEWS_HINT].filter(Boolean).join('\n') || undefined}>
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
