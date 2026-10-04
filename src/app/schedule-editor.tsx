import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ActionButton, Body, Card, Field, Screen } from '@/components/ui/page';
import { CELL_COLORS } from '@/features/schedule/cell-colors';
import { PERIOD_NAMES, WEEKDAYS, WEEKDAY_LABELS, type CellColor, type PeriodName, type Weekday } from '@/features/schedule/timetable';
import { ChoiceField } from '@/features/todo/form-controls';
import { useScheduleStore } from '@/store/schedule';

export default function ScheduleEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period: string; day: string }>();
  const period = params.period as PeriodName;
  const day = params.day as Weekday;
  const valid = PERIOD_NAMES.includes(period) && WEEKDAYS.includes(day);
  const cell = useScheduleStore((state) => valid ? state.rows.find((row) => row.name === period)?.[day] : undefined);
  const updateCell = useScheduleStore((state) => state.updateCell);
  const [subject, setSubject] = useState(cell?.subject ?? '');
  const [note, setNote] = useState(cell?.note ?? '');
  const [color, setColor] = useState<CellColor>(cell?.color ?? 'Default');

  function save() {
    if (!cell) return;
    updateCell(period, day, { ...cell, subject: subject.trim(), note: note.trim(), color });
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: valid ? `${WEEKDAY_LABELS[day]}第${period}節` : '編輯課程' }} />
      {cell ? <>
        <Card>
          <Field label="科目" value={subject} onChangeText={setSubject} />
          <Field label="備註" value={note} onChangeText={setNote} multiline />
          <ChoiceField label="顏色" value={color} options={CELL_COLORS.map((option) => ({ label: option.label, value: option.key }))} onChange={(value) => setColor(value as CellColor)} />
          {cell.alternating && <Body secondary>此課程原為單週 {cell.alternating.odd}／雙週 {cell.alternating.even}。填寫新的科目會取代輪替顯示。</Body>}
        </Card>
        <ActionButton label="儲存" onPress={save} />
      </> : <Body>找不到此課程，請返回課表。</Body>}
      <ActionButton label="取消" onPress={() => router.back()} />
    </Screen>
  );
}
