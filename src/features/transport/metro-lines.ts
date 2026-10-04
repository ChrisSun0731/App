// Taipei Metro lines and the stations on each, in route order.
//
// The Quasar app kept one object literal of station -> lines, which listed
// interchange stations twice; a duplicate key silently overwrote the first
// (景安 lost its Orange line). Building the table from per-line lists makes
// that mistake impossible.

export const METRO_LINES = ['BR', 'R', 'G', 'O', 'BL', 'Y'] as const;
export type MetroLine = (typeof METRO_LINES)[number];

export const METRO_LINE_COLORS: Record<MetroLine, string> = {
  BR: '#c48c31',
  R: '#e3002c',
  G: '#008659',
  O: '#f8b61c',
  BL: '#0070bd',
  Y: '#ffdb00',
};

export const METRO_LINE_NAMES: Record<MetroLine, string> = {
  BR: '文湖線',
  R: '淡水信義線',
  G: '松山新店線',
  O: '中和新蘆線',
  BL: '板南線',
  Y: '環狀線',
};

const LINE_STATIONS: Record<MetroLine, readonly string[]> = {
  BR: [
    '動物園', '木柵', '萬芳社區', '萬芳醫院', '辛亥', '麟光', '六張犁', '科技大樓',
    '大安', '忠孝復興', '南京復興', '中山國中', '松山機場', '大直', '劍南路', '西湖',
    '港墘', '文德', '內湖', '大湖公園', '葫洲', '東湖', '南港軟體園區', '南港展覽館',
  ],
  R: [
    '象山', '台北101/世貿', '信義安和', '大安', '大安森林公園', '東門', '中正紀念堂',
    '台大醫院', '台北車站', '中山', '雙連', '民權西路', '圓山', '劍潭', '士林', '芝山',
    '明德', '石牌', '唭哩岸', '奇岩', '北投', '新北投', '復興崗', '忠義', '關渡', '竹圍',
    '紅樹林', '淡水',
  ],
  G: [
    '新店', '新店區公所', '七張', '小碧潭', '大坪林', '景美', '萬隆', '公館', '台電大樓',
    '古亭', '中正紀念堂', '小南門', '西門', '北門', '中山', '松江南京', '南京復興',
    '台北小巨蛋', '南京三民', '松山',
  ],
  O: [
    '南勢角', '景安', '永安市場', '頂溪', '古亭', '東門', '忠孝新生', '松江南京', '行天宮',
    '中山國小', '民權西路', '大橋頭', '台北橋', '菜寮', '三重', '先嗇宮', '頭前庄', '新莊',
    '輔大', '丹鳳', '迴龍', '三重國小', '三和國中', '徐匯中學', '三民高中', '蘆洲',
  ],
  BL: [
    '頂埔', '永寧', '土城', '海山', '亞東醫院', '府中', '板橋', '新埔', '江子翠', '龍山寺',
    '西門', '台北車站', '善導寺', '忠孝新生', '忠孝復興', '忠孝敦化', '國父紀念館', '市政府',
    '永春', '後山埤', '昆陽', '南港', '南港展覽館',
  ],
  Y: [
    '大坪林', '十四張', '秀朗橋', '景平', '景安', '中和', '橋和', '中原', '板新', '板橋',
    '新埔民生', '頭前庄', '幸福', '新北產業園區',
  ],
};

/** Lines serving each station, in METRO_LINES order. */
export const STATION_LINES: Readonly<Record<string, readonly MetroLine[]>> = (() => {
  const table: Record<string, MetroLine[]> = {};
  for (const line of METRO_LINES) {
    for (const station of LINE_STATIONS[line]) {
      (table[station] ??= []).push(line);
    }
  }
  return table;
})();

export function linesOfStation(station: string): readonly MetroLine[] {
  return STATION_LINES[station] ?? [];
}

export function stationsOnLine(line: MetroLine): readonly string[] {
  return LINE_STATIONS[line];
}

export const DEFAULT_METRO_STATIONS = ['中正紀念堂', '小南門', '西門'];
