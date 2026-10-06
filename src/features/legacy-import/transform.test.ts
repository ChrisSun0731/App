import { describe, expect, jest, test } from '@jest/globals';

import { toDateKey } from '@/lib/dates';
import { defaultToolbar } from '@/store/settings';

import { hasLegacyData, toHexColor, transformLegacyStore } from './transform';

// normalizeToolbar lives in the settings store, which persists through SQLite.
jest.mock('@/lib/storage', () => ({
  persistStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

/** Calendar day in Taipei, where the previous app's users saved these dates. */
const taipeiDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(date);

/** A realistic "store" value: the whole Vuex state as the Quasar app saved it. */
const legacyState = {
  youbike: {
    stationList: {
      'YouBike2.0_泉州寧波西街口': { nickname: '建中東側門', city: '臺北市' },
      'YouBike2.0_捷運板橋站(1號出口)': { nickname: '板橋', city: '新北市' },
      'YouBike2.0_植物園': { nickname: '', city: '台北市' },
      'YouBike2.0_高雄車站': { nickname: '高雄', city: '高雄市' },
      'YouBike2.0_壞資料': 'oops',
    },
  },
  news: {
    pinnedNews: [
      { title: '段考公告', pubDate: '2026-09-30T02:00:00.000Z', link: 'https://www.ck.tp.edu.tw/nss/p/1' },
      { title: '段考公告', pubDate: '2026-09-29T02:00:00.000Z', link: 'https://www.ck.tp.edu.tw/nss/p/2' },
      // Restored from the old Firebase backup.
      { title: '還原的釘選', pubDate: { seconds: 1759190400, nanoseconds: 0 }, link: 'https://www.ck.tp.edu.tw/nss/p/3' },
      { title: '沒有日期', pubDate: null, link: 'https://www.ck.tp.edu.tw/nss/p/4' },
      { title: '壞連結', pubDate: '2026-09-30T02:00:00.000Z', link: 'javascript:alert(1)' },
    ],
    lastClearedTime: '2026-10-01T04:05:06.000Z',
    displayNewsWidget: false,
    fetchedNews: [{ title: '快取', pubDate: '2026-10-03T00:00:00.000Z', link: 'https://www.ck.tp.edu.tw/nss/p/5' }],
    lastFetchTime: '2026-10-04T00:00:00.000Z',
  },
  schedule: {
    scheduleData: [
      {
        name: '一',
        Monday: { subject: '國文', note: '帶課本', color: { label: 'Red', value: '#FFCCCB' } },
        Tuesday: { subject: '物理', alternating: { odd: '物理', even: '化學' } },
        Wednesday: { subject: '自習', alternating: { odd: '物理', even: '化學' }, note: '', color: 'Default' },
        Thursday: { subject: '自訂', customSubject: '社團', color: 'Blue' },
        Friday: '英文',
      },
      {
        name: '二',
        Monday: { subject: '數學', color: '#90ee90' },
        Tuesday: { subject: '', note: '', color: { label: 'Default', value: '#f4f4f1' } },
        Wednesday: null,
        Thursday: { subject: '自訂', customSubject: '' },
        Friday: { subject: '體育', color: 'Magenta' },
      },
      'junk',
      { name: '第四', Monday: { subject: '音樂' } },
    ],
    userClass: 205,
    displayScheduleWidget: true,
  },
  todo: {
    events: [
      { id: 1759507200000, title: '段考', startDate: '2026-10-13T16:00:00.000Z', endDate: '2026-10-15T16:00:00.000Z', category: { name: '考試', color: '#f00' } },
      // Saved again without changing the dates: UTC midnight.
      { id: 1759507200001, title: '校慶', startDate: '2026-11-14T00:00:00.000Z', endDate: '2026-11-14T00:00:00.000Z', category: { name: '學校事務', color: '#4285F4' } },
      { id: 1759507200000, title: '重複 id', startDate: '2026-10-20T16:00:00.000Z', endDate: '2026-10-19T16:00:00.000Z', category: {} },
      { id: 5, title: '刪掉的類別', startDate: '2026-12-01T16:00:00.000Z', endDate: null, category: { name: '舊類別', color: '#abcdef' } },
      { title: '沒有 id', startDate: '2026-12-24T16:00:00.000Z', endDate: '2026-12-24T16:00:00.000Z', category: { name: '社團' } },
      { id: 6, title: '   ', startDate: '2026-12-24T16:00:00.000Z', endDate: '2026-12-24T16:00:00.000Z' },
      { id: 7, title: '壞日期', startDate: null, endDate: 'garbage' },
      'junk',
    ],
    eventCategories: [
      { name: 'Default', color: '#ADADAD' },
      { name: '考試', color: '#f00' },
      { name: '社團', color: 'rgba(21, 101, 192, 0.5)' },
      { name: '考試', color: '#00FF00' },
      { name: '學校事務', color: '#4285F4' },
      { name: '', color: '#123456' },
      { name: '其他', color: 'blue' },
    ],
    displayTodoWidget: 'yes',
    todos: [
      { id: 1759600000000, title: '交作業', date: '2026-10-04T16:00:00.000Z', completed: false, category: { name: '作業' } },
      { id: 1759600000001, title: '買筆', date: null, completed: false, category: null },
      { id: 1759600000002, title: '已完成', date: null, completed: true, category: null },
      { id: 1759600000003, title: '亂日期', date: 'not a date', category: '考試' },
      { id: 1759600000000, title: '重複', date: '2026-10-05T16:00:00.000Z' },
      { title: '' },
    ],
    currentView: 'todoList',
    todoCategories: [{ name: '作業' }, { name: '作業' }, { name: ' 考試 ' }, { name: '' }, null],
  },
  food: {
    favoriteRestaurants: [
      { name: '建中黑白切', lat: 25.03, lng: 121.51 },
      { name: '建中黑白切' },
      { name: '  ' },
      { name: '南門市場' },
    ],
  },
  settings: {
    menuItems: [
      { label: '首頁', icon: 'home', link: '/', visible: true, fixed: true },
      { label: '美食', icon: 'fastfood', link: '/food', visible: true },
      { label: '特約', icon: 'store', link: '/promo', visible: false },
      { label: '紀念品', icon: 'shopping_bag', link: '/souvenir', visible: false },
      { label: '課表', icon: 'book', link: '/schedule', visible: true },
      { label: '行事曆', icon: 'calendar_month', link: '/todo', visible: true },
      { label: '交通', icon: 'directions_walk', link: '/transport', visible: true },
      { label: '熱食部', icon: 'restaurant_menu', link: '/menu', visible: true },
      { label: '校網', icon: 'newspaper', link: '/news', visible: true },
    ],
  },
  metro: { metroStationList: ['中正紀念堂', '台北車站', '台北車站', '不存在站', 42, 'constructor'] },
};

const empty = { subject: '' };
const emptyRow = (name: string) => ({ name, Monday: empty, Tuesday: empty, Wednesday: empty, Thursday: empty, Friday: empty });

describe('legacy store transform', () => {
  const result = transformLegacyStore(JSON.stringify(legacyState), '101', { dateKey: taipeiDay });

  test('keeps the timetable cell by cell: notes, colours, alternating weeks and overrides', () => {
    // The module's class wins over the separate key, and numeric classes become ids.
    expect(result.schedule?.userClass).toBe('205');
    expect(result.schedule?.rows).toEqual([
      {
        name: '一',
        Monday: { subject: '國文', note: '帶課本', color: 'Red' },
        Tuesday: { subject: '物理', alternating: { odd: '物理', even: '化學' } },
        // A subject matching neither week stays the user's override.
        Wednesday: { subject: '自習', alternating: { odd: '物理', even: '化學' } },
        Thursday: { subject: '社團', color: 'Blue' },
        Friday: { subject: '英文' },
      },
      {
        name: '二',
        Monday: { subject: '數學', color: 'Green' },
        Tuesday: empty,
        Wednesday: empty,
        Thursday: { subject: '自訂' },
        Friday: { subject: '體育' },
      },
      emptyRow('三'),
      // An unrecognised row name is placed by position.
      { ...emptyRow('四'), Monday: { subject: '音樂' } },
      emptyRow('五'),
      emptyRow('六'),
      emptyRow('七'),
      emptyRow('八'),
    ]);
  });

  test('converts UTC-serialised dates to local days, string ids and valid categories', () => {
    expect(result.todo?.eventCategories).toEqual([
      { name: 'Default', color: '#ADADAD' },
      { name: '考試', color: '#FF0000' },
      { name: '社團', color: '#1565C0' },
      // Reserved for the read-only school calendar here.
      { name: '學校事務（自訂）', color: '#4285F4' },
      { name: '其他', color: '#ADADAD' },
    ]);
    expect(result.todo?.events).toEqual([
      { id: '1759507200000', title: '段考', startDate: '2026-10-14', endDate: '2026-10-16', category: { name: '考試', color: '#FF0000' } },
      { id: '1759507200001', title: '校慶', startDate: '2026-11-14', endDate: '2026-11-14', category: { name: '學校事務（自訂）', color: '#4285F4' } },
      { id: 'legacy-event-2', title: '重複 id', startDate: '2026-10-20', endDate: '2026-10-21', category: { name: 'Default', color: '#ADADAD' } },
      { id: '5', title: '刪掉的類別', startDate: '2026-12-02', endDate: '2026-12-02', category: { name: '舊類別', color: '#ABCDEF' } },
      { id: 'legacy-event-4', title: '沒有 id', startDate: '2026-12-25', endDate: '2026-12-25', category: { name: '社團', color: '#1565C0' } },
    ]);
    expect(result.todo?.todos).toEqual([
      { id: '1759600000000', title: '交作業', date: '2026-10-05', category: { name: '作業' } },
      { id: '1759600000001', title: '買筆', date: null, category: null },
      { id: '1759600000003', title: '亂日期', date: null, category: { name: '考試' } },
      { id: 'legacy-todo-4', title: '重複', date: '2026-10-06', category: null },
    ]);
    expect(result.todo?.todoCategories).toEqual([{ name: '作業' }, { name: '考試' }]);
    expect(result.todo?.view).toBe('todoList');
  });

  test('reads dates in the device time zone by default', () => {
    const local = transformLegacyStore({
      todo: { todos: [{ id: 1, title: 't', date: '2026-10-03T16:00:00.000Z' }, { id: 2, title: 'u', date: '2026-10-09' }] },
    });
    expect(local.todo?.todos?.map((todo) => todo.date)).toEqual([toDateKey(new Date('2026-10-03T16:00:00.000Z')), '2026-10-09']);
  });

  test('keeps pins, favourites, stations, toolbar and widgets, dropping junk and duplicates', () => {
    expect(result.news).toEqual({
      pinned: [
        { title: '段考公告', link: 'https://www.ck.tp.edu.tw/nss/p/1', pubDate: '2026-09-30T02:00:00.000Z' },
        { title: '還原的釘選', link: 'https://www.ck.tp.edu.tw/nss/p/3', pubDate: '2025-09-30T00:00:00.000Z' },
      ],
      lastClearedTime: '2026-10-01T04:05:06.000Z',
    });
    expect(result.food).toEqual({ favorites: ['建中黑白切', '南門市場'] });
    expect(result.transport).toEqual({
      youbike: [
        { sna: 'YouBike2.0_泉州寧波西街口', nickname: '建中東側門', city: '臺北市' },
        { sna: 'YouBike2.0_捷運板橋站(1號出口)', nickname: '板橋', city: '新北市' },
        { sna: 'YouBike2.0_植物園', nickname: '植物園', city: '臺北市' },
      ],
      metro: ['中正紀念堂', '台北車站'],
    });
    expect(result.settings).toEqual({
      toolbar: [
        { id: 'food', visible: true },
        { id: 'promo', visible: false },
        { id: 'souvenir', visible: false },
        { id: 'schedule', visible: true },
        { id: 'todo', visible: true },
        { id: 'transport', visible: true },
        // Only four tabs fit next to 首頁.
        { id: 'menu', visible: false },
        { id: 'news', visible: false },
      ],
      homeWidgets: { schedule: true, news: false },
    });
    expect(hasLegacyData(result)).toBe(true);
  });

  test('maps toolbar entries by link, then label, and fills in features the old app lacked', () => {
    const toolbar = (menuItems: unknown) => transformLegacyStore({ settings: { menuItems } }).settings?.toolbar;
    expect(toolbar([
      { label: '首頁', link: '/', visible: true, fixed: true },
      { label: '校網', link: '#/news', visible: true },
      { label: '建北特約', link: '/old-promo', visible: true },
      { label: '?', link: 5, visible: true },
    ])?.slice(0, 3)).toEqual([{ id: 'news', visible: true }, { id: 'promo', visible: true }, { id: 'souvenir', visible: false }]);
    // The old default showed every entry; the first four fit.
    expect(toolbar(['promo', 'souvenir', 'schedule', 'todo', 'transport', 'menu', 'food', 'news']
      .map((id) => ({ link: `/${id}`, visible: true })))).toEqual(defaultToolbar());
    expect(toolbar([{ label: '首頁', link: '/' }])).toBeUndefined();
    expect(toolbar('menu')).toBeUndefined();
  });

  test('imports what is valid from missing, partial or junk state without throwing', () => {
    expect(transformLegacyStore(null)).toEqual({});
    expect(transformLegacyStore('{not json')).toEqual({});
    expect(hasLegacyData(transformLegacyStore(undefined))).toBe(false);
    // Only the separate key survives.
    expect(transformLegacyStore('null', '305')).toEqual({ schedule: { userClass: '305' } });
    expect(transformLegacyStore({
      schedule: { userClass: 'abc', scheduleData: 'rows' },
      todo: [],
      news: 7,
      food: { favoriteRestaurants: {} },
      youbike: { stationList: [] },
      settings: { menuItems: [{ link: '/nowhere' }] },
    })).toEqual({});
    // The old app had not loaded a timetable yet: the screens will load the class's own.
    expect(transformLegacyStore({ schedule: { userClass: '101', scheduleData: [{ name: '一' }, {}] } }))
      .toEqual({ schedule: { userClass: '101' } });
    // Early versions kept the read marker at the top level.
    expect(transformLegacyStore({ lastClearedTime: '2026-01-01T00:00:00.000Z' }).news)
      .toEqual({ lastClearedTime: '2026-01-01T00:00:00.000Z' });
    // 恢復已讀訊息 left this marker, which means nothing is marked read.
    expect(transformLegacyStore({ news: { lastClearedTime: new Date('2010-01-01').toISOString() } }).news).toBeUndefined();
    expect(transformLegacyStore({ news: { lastClearedTime: '2009-12-31T16:00:00.000Z', pinnedNews: [] } }).news).toEqual({ pinned: [] });
    // Every category deleted: this app needs one.
    expect(transformLegacyStore({ todo: { eventCategories: [] } }).todo?.eventCategories).toEqual([{ name: 'Default', color: '#ADADAD' }]);
    // Followed stations all removed is a choice worth keeping.
    expect(transformLegacyStore({ youbike: { stationList: {} }, metro: { metroStationList: [] } }).transport).toEqual({ youbike: [], metro: [] });
  });
});

describe('category colours', () => {
  test('normalises picker and typed formats to #RRGGBB', () => {
    expect(toHexColor('#abc')).toBe('#AABBCC');
    expect(toHexColor('#abcd')).toBe('#AABBCC');
    expect(toHexColor(' #12ab34 ')).toBe('#12AB34');
    expect(toHexColor('#12ab34cc')).toBe('#12AB34');
    expect(toHexColor('rgb(255, 0, 128)')).toBe('#FF0080');
    expect(toHexColor('rgba(0,0,0,0.5)')).toBe('#000000');
    for (const junk of ['blue', 'rgb(256, 0, 0)', '#12', '#ggg', 12, null]) expect(toHexColor(junk)).toBeNull();
  });
});
