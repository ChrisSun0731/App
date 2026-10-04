import { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { ActionButton, Body, Card, Field, Screen, Segment, Title } from '@/components/ui/page';
import { formatFullDate, pad2 } from '@/lib/dates';
import { useNewsStore } from '@/store/news';

import { unreadNews, type NewsItem } from './rss';
import { useSchoolNews } from './use-school-news';

const PAGE_SIZE = 20;

export default function NewsScreen() {
  const query = useSchoolNews();
  const { pinned, cached, lastClearedTime, lastFetchTime, pin, unpin, markAllRead, restoreAll } = useNewsStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const groups = useMemo(() => {
    const fetched = query.data ?? cached;
    const unread = unreadNews(fetched, lastClearedTime, pinned);
    const pinnedTitles = new Set(pinned.map((item) => item.title));
    const unreadTitles = new Set(unread.map((item) => item.title));
    const read = fetched.filter((item) => !pinnedTitles.has(item.title) && !unreadTitles.has(item.title));
    const all = [...new Map([...fetched, ...pinned].map((item) => [item.title, item])).values()];
    const descending = (items: NewsItem[]) => [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate));
    return [descending(unread), descending(pinned), descending(read), descending(all)];
  }, [query.data, cached, pinned, lastClearedTime]);
  const term = search.trim().toLocaleLowerCase();
  const filtered = groups[filter].filter((item) => !term || item.title.toLocaleLowerCase().includes(term));
  const pinnedTitles = new Set(pinned.map((item) => item.title));

  const confirmRead = () => Alert.alert('已讀所有訊息', '將所有未釘選的消息標示為已讀？已釘選的消息會保留。', [
    { text: '取消', style: 'cancel' },
    { text: '標示已讀', onPress: markAllRead },
  ]);

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }}>
      <Title>校網消息</Title>
      <Body secondary>建中重要公告與最新消息</Body>
      <Card>
        <Field label="搜尋消息" value={search} onChangeText={(value) => { setSearch(value); setVisibleCount(PAGE_SIZE); }} />
        <Segment options={['未讀', '已釘選', '已讀', '全部']} selectedIndex={filter} onChange={(value) => { setFilter(value); setVisibleCount(PAGE_SIZE); }} />
        <View style={styles.actions}>
          <ActionButton label="已讀所有訊息" onPress={confirmRead} disabled={!groups[0].length} />
          <ActionButton label="恢復已讀訊息" onPress={restoreAll} disabled={lastClearedTime === null} />
          <ActionButton label="重新整理" onPress={() => { void query.refetch(); }} disabled={query.isFetching} />
        </View>
        {lastFetchTime && <Body secondary>最後更新：{formatTimestamp(lastFetchTime)}</Body>}
      </Card>
      {query.isPending && query.isFetching && <Body secondary>正在讀取校網消息…</Body>}
      {query.isError && (
        <Card>
          <Body>{cached.length || query.data?.length ? '校網目前無法更新，先顯示上次儲存的消息。' : '無法讀取校網消息，請檢查網路後重試。'}</Body>
          <ActionButton label="重試" onPress={() => { void query.refetch(); }} />
        </Card>
      )}
      <Body secondary>{filtered.length} 則消息</Body>
      {!filtered.length && !query.isFetching && (
        <Card><Body>{term ? '沒有符合關鍵字的消息。' : ['目前沒有未讀消息。', '目前沒有釘選消息。', '目前沒有已讀消息。', '目前沒有消息。'][filter]}</Body></Card>
      )}
      {filtered.slice(0, visibleCount).map((item) => {
        const isPinned = pinnedTitles.has(item.title);
        return (
          <Card key={item.title}>
            {isPinned && <Body secondary>已釘選</Body>}
            <Title>{item.title}</Title>
            <Body secondary>{formatTimestamp(item.pubDate)}</Body>
            <View style={styles.actions}>
              <ActionButton label="開啟公告" onPress={() => { void openNews(item.link); }} />
              <ActionButton label={isPinned ? '取消釘選' : '釘選'} onPress={() => isPinned ? unpin(item.title) : pin(item)} />
            </View>
          </Card>
        );
      })}
      {filtered.length > visibleCount && <ActionButton label={`顯示更多（還有 ${filtered.length - visibleCount} 則）`} onPress={() => setVisibleCount((count) => count + PAGE_SIZE)} />}
    </Screen>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return `${formatFullDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

async function openNews(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('無法開啟公告', '請稍後再試一次。'); }
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
