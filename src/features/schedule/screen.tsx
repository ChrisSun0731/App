import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { ActionButton, Body, Card, Screen, Segment, Title } from '@/components/ui/page';
import { ChoiceField } from '@/features/todo/form-controls';
import { useScheduleStore } from '@/store/schedule';
import { usePalette } from '@/theme/palette';

import { cellFill } from './cell-colors';
import {
  getAlternating,
  getCurrentPeriod,
  getWeekNumber,
  getWeekParity,
  subjectFor,
  WEEKDAYS,
  WEEKDAY_LABELS,
  weekdayOf,
} from './timetable';
import { useTimetables } from './use-timetables';

export default function ScheduleScreen() {
  const router = useRouter();
  const palette = usePalette();
  const timetable = useTimetables();
  const { userClass, rows, setClass, resetRows } = useScheduleStore();
  const [now, setNow] = useState(() => new Date());
  const [dayIndex, setDayIndex] = useState(() => Math.max(0, WEEKDAYS.indexOf(weekdayOf(new Date()) ?? 'Monday')));
  const day = WEEKDAYS[dayIndex];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rows.length === 0 && timetable.data?.byClass[userClass]) {
      resetRows(timetable.data.byClass[userClass]);
    }
  }, [resetRows, rows.length, timetable.data, userClass]);

  function changeClass(next: string) {
    if (next === userClass || !timetable.data?.byClass[next]) return;
    Alert.alert('更改班級', `改為 ${next} 班會清除目前課表的修改。`, [
      { text: '取消', style: 'cancel' },
      { text: '更改', style: 'destructive', onPress: () => setClass(next, timetable.data!.byClass[next]) },
    ]);
  }

  function resetTimetable() {
    const original = timetable.data?.byClass[userClass];
    if (!original) return;
    Alert.alert('重新匯入課表', '將清除所有科目、備註和顏色修改。', [
      { text: '取消', style: 'cancel' },
      { text: '重新匯入', style: 'destructive', onPress: () => resetRows(original) },
    ]);
  }

  const week = getWeekNumber(timetable.data?.semesterStart ?? null, now);
  const parity = getWeekParity(timetable.data?.semesterStart ?? null, now);
  const currentPeriod = getCurrentPeriod(timetable.data?.periods ?? [], now);
  const options = (timetable.data?.classIds ?? []).map((id) => ({ label: `${id} 班`, value: id }));
  if (!options.some((option) => option.value === userClass)) {
    options.unshift({ label: `${userClass} 班`, value: userClass });
  }

  return (
    <Screen refreshing={timetable.isRefetching} onRefresh={() => { void timetable.refetch(); }}>
      <Title>{userClass} 班課表</Title>
      <Body secondary>
        {[timetable.data?.academicYear, week ? `第${week}週` : '', parity === 'odd' ? '單週' : '雙週'].filter(Boolean).join(' · ')}
      </Body>
      <Card>
        <ChoiceField label="班級" value={userClass} options={options} onChange={changeClass} disabled={!timetable.data} />
        <ActionButton label="重新匯入課表" onPress={resetTimetable} disabled={!timetable.data?.byClass[userClass]} />
      </Card>
      <Segment options={['一', '二', '三', '四', '五']} selectedIndex={dayIndex} onChange={setDayIndex} />
      <Body secondary>{WEEKDAY_LABELS[day]}</Body>
      {timetable.isPending && rows.length === 0 && <Body secondary>正在載入課表…</Body>}
      {timetable.error && <Card><Body secondary>暫時無法更新課表。可下拉重試。</Body></Card>}
      {rows.length === 0 && !timetable.isPending && <Body secondary>此班級課表尚未載入，請選擇班級或重新整理。</Body>}
      {rows.map((row) => {
        const cell = row[day];
        const alternating = getAlternating(cell);
        const period = timetable.data?.periods.find((item) => item.name === row.name);
        const isCurrent = weekdayOf(now) === day && currentPeriod === row.name;
        return (
          <Pressable
            key={row.name}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAY_LABELS[day]}第${row.name}節 ${subjectFor(cell, parity) || '空堂'}，編輯課程`}
            onPress={() => router.push({ pathname: '/schedule-editor', params: { period: row.name, day } })}
            style={({ pressed }) => ({
              borderRadius: 16,
              padding: 16,
              backgroundColor: cellFill(cell.color, palette.scheme) ?? palette.surface,
              borderWidth: isCurrent ? 2 : 0,
              borderColor: palette.tint,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <View style={{ width: 66, gap: 4 }}>
                <Text style={{ color: isCurrent ? palette.tint : palette.text, fontSize: 20, fontWeight: '600' }}>第{row.name}節</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{period?.start ?? ''}</Text>
                {isCurrent && <Text style={{ color: palette.tint, fontSize: 12 }}>目前課程</Text>}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{subjectFor(cell, parity) || '空堂'}</Text>
                {alternating && <Text style={{ color: palette.textSecondary }}>單週：{alternating.odd}　雙週：{alternating.even}</Text>}
                {!!cell.note && <Text style={{ color: palette.textSecondary }}>{cell.note}</Text>}
              </View>
            </View>
          </Pressable>
        );
      })}
      <Body secondary>點選課程可修改科目、備註與顏色。</Body>
    </Screen>
  );
}
