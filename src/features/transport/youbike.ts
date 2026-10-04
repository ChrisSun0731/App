// YouBike 2.0 availability from the Taipei and New Taipei open-data APIs,
// ported from the Quasar app's YoubikeSection.vue / useYoubike.js.
//
// The two cities publish different schemas, so both are normalised into
// `YoubikeStation`. New Taipei's API changed shape since the Quasar app was
// written (`sbi` became `sbi_quantity`, numbers became strings, `mday` became
// "20261004T093903"), which left its bike counts blank; both shapes are read.
import { getJson } from '@/lib/http';

export const YOUBIKE_TPC_URL =
  'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json';

const YOUBIKE_NTC_URL =
  'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json';
const NTC_PAGE_SIZE = 1000;
/** Guards against a misbehaving API paging forever. */
const NTC_MAX_PAGES = 6;

export type City = '臺北市' | '新北市';
export const CITIES: readonly City[] = ['臺北市', '新北市'];

export interface YoubikeStation {
  /** Station id used by both APIs, e.g. "YouBike2.0_植物園". */
  sna: string;
  city: City;
  /** 行政區, e.g. "中正區" */
  area: string;
  /** Bikes available to rent; null when the API omitted it. */
  rent: number | null;
  /** Empty docks available to return to. */
  return: number | null;
  latitude: number;
  longitude: number;
  /** When the station last reported, if parseable. */
  updatedAt: Date | null;
}

/** A station the user follows, as persisted: nickname shown on its card. */
export interface FollowedStation {
  nickname: string;
  city: City;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** API timestamps use Taipei time, independent of the phone's current zone. */
export function parseStationTime(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-?(\d{2})-?(\d{2})[ T]?(\d{2}):?(\d{2}):?(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  const local = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (local.getUTCFullYear() !== y || local.getUTCMonth() !== mo - 1 || local.getUTCDate() !== d ||
    local.getUTCHours() !== h || local.getUTCMinutes() !== mi || local.getUTCSeconds() !== s) return null;
  return new Date(local.getTime() - 8 * 60 * 60 * 1000);
}

interface TpcRecord {
  sna: string;
  sarea: string;
  available_rent_bikes?: number;
  available_return_bikes?: number;
  latitude: number;
  longitude: number;
  mday?: string;
}

interface NtcRecord {
  sna: string;
  sarea: string;
  sbi?: string | number;
  sbi_quantity?: string | number;
  bemp?: string | number;
  lat: string | number;
  lng: string | number;
  mday?: string;
}

export function normalizeTpc(record: TpcRecord): YoubikeStation {
  return {
    sna: record.sna,
    city: '臺北市',
    area: record.sarea,
    rent: toNumber(record.available_rent_bikes),
    return: toNumber(record.available_return_bikes),
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    updatedAt: parseStationTime(record.mday),
  };
}

export function normalizeNtc(record: NtcRecord): YoubikeStation {
  return {
    sna: record.sna,
    city: '新北市',
    area: record.sarea,
    rent: toNumber(record.sbi_quantity ?? record.sbi),
    return: toNumber(record.bemp),
    latitude: Number(record.lat),
    longitude: Number(record.lng),
    updatedAt: parseStationTime(record.mday),
  };
}

export async function fetchTaipeiStations(signal?: AbortSignal): Promise<YoubikeStation[]> {
  const records = await getJson<TpcRecord[]>(YOUBIKE_TPC_URL, { signal });
  return records.map(normalizeTpc);
}

/** The New Taipei dataset is paginated; reads pages until one comes back short. */
export async function fetchNewTaipeiStations(signal?: AbortSignal): Promise<YoubikeStation[]> {
  const stations: YoubikeStation[] = [];
  for (let page = 0; page < NTC_MAX_PAGES; page++) {
    const url = `${YOUBIKE_NTC_URL}?page=${page}&size=${NTC_PAGE_SIZE}`;
    const records = await getJson<NtcRecord[]>(url, { signal });
    stations.push(...records.map(normalizeNtc));
    if (records.length < NTC_PAGE_SIZE) break;
  }
  return stations;
}

export function fetchStations(city: City, signal?: AbortSignal): Promise<YoubikeStation[]> {
  return city === '臺北市' ? fetchTaipeiStations(signal) : fetchNewTaipeiStations(signal);
}

const SNA_PREFIX = /^YouBike2\.0_/;

/** "YouBike2.0_植物園" -> "植物園" */
export function stationDisplayName(sna: string): string {
  return sna.replace(SNA_PREFIX, '');
}

/** Station cards show at most seven characters, as before. */
export const CARD_NAME_LENGTH = 7;

export type AvailabilityLevel = 'none' | 'low' | 'ok' | 'unknown';

/** 0 = none (red), 1-3 = low (orange), otherwise ok (green). */
export function availabilityLevel(count: number | null): AvailabilityLevel {
  if (count === null) return 'unknown';
  if (count === 0) return 'none';
  if (count <= 3) return 'low';
  return 'ok';
}

const EARTH_RADIUS_KM = 6371;
const deg2rad = (deg: number) => deg * (Math.PI / 180);

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface StationWithDistance extends YoubikeStation {
  distanceKm: number;
}

export const NEAREST_COUNT = 9;

/** The `count` stations closest to a point, nearest first. */
export function nearestStations(
  stations: YoubikeStation[],
  latitude: number,
  longitude: number,
  count = NEAREST_COUNT,
): StationWithDistance[] {
  return stations
    .filter((s) => Number.isFinite(s.latitude) && Math.abs(s.latitude) <= 90 &&
      Number.isFinite(s.longitude) && Math.abs(s.longitude) <= 180)
    .map((s) => ({ ...s, distanceKm: distanceKm(latitude, longitude, s.latitude, s.longitude) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

/** 行政區 lists for the add-station picker. */
export const DISTRICTS: Record<City, readonly string[]> = {
  臺北市: [
    '大安區', '中正區', '萬華區', '信義區', '南港區', '文山區', '大同區',
    '中山區', '松山區', '內湖區', '士林區', '北投區', '臺大公館校區',
  ],
  新北市: [
    '板橋區', '三重區', '中和區', '永和區', '蘆洲區', '新莊區', '新店區',
    '土城區', '樹林區', '五股區', '泰山區', '汐止區', '深坑區', '石碇區',
    '三峽區', '淡水區', '八里區', '三芝區', '石門區', '金山區', '林口區',
    '坪林區', '萬里區', '瑞芳區', '雙溪區', '鶯歌區',
  ],
};

/** Stations the app follows on first launch. */
export const DEFAULT_FOLLOWED_STATIONS: Record<string, FollowedStation> = {
  'YouBike2.0_泉州寧波西街口': { nickname: '建中東側門', city: '臺北市' },
  'YouBike2.0_郵政博物館': { nickname: '郵政博物館', city: '臺北市' },
  'YouBike2.0_植物園': { nickname: '台北植物園', city: '臺北市' },
  'YouBike2.0_捷運中正紀念堂站(2號出口)': { nickname: '中正紀念堂站', city: '臺北市' },
};

/** Where the "nearest stations" map opens: 建中. */
export const CK_COORDINATE = { latitude: 25.031204, longitude: 121.515966 };
