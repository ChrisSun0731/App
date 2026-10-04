import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ActionButton, Body, Card, Field, Screen, Toggle } from '@/components/ui/page';
import { CELL_COLORS } from '@/features/schedule/cell-colors';
import {
  cellFromDraft,
  draftFromCell,
  PERIOD_NAMES,
  setDraftRotating,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type CellColor,
  type CellDraft,
  type PeriodName,
  type Weekday,
} from '@/features/schedule/timetable';
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
  const [draft, setDraft] = useState(() => draftFromCell(cell ?? { subject: '' }));
  const edit = (patch: Partial<CellDraft>) => setDraft((current) => ({ ...current, ...patch }));
  // The stored weeks, still mentioned while rotation is switched off so the
  // user can see what turning it off replaces.
  const original = cell?.alternating;

  function save() {
    if (!cell) return;
    updateCell(period, day, cellFromDraft(draft));
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: valid ? `${WEEKDAY_LABELS[day]}第${period}節` : '編輯課程' }} />
      {cell ? <>
        <Card>
          <Toggle label="單雙週輪替" value={draft.rotating} onChange={(on) => setDraft((current) => setDraftRotating(current, on))} />
          {draft.rotating ? <>
            <Body secondary>單週與雙週分別顯示各自的科目，留空代表該週空堂。</Body>
            <Field key="odd" label="單週科目" value={draft.odd} onChangeText={(odd) => edit({ odd })} />
            <Field key="even" label="雙週科目" value={draft.even} onChangeText={(even) => edit({ even })} />
          </> : <>
            <Body secondary>
              每週都顯示此科目，留空代表空堂。
              {original && `原為單週 ${original.odd || '空堂'}／雙週 ${original.even || '空堂'}。`}
            </Body>
            <Field key="subject" label="科目" value={draft.subject} onChangeText={(subject) => edit({ subject })} />
          </>}
          <Field label="備註" value={draft.note} onChangeText={(note) => edit({ note })} multiline />
          <ChoiceField label="顏色" value={draft.color} options={CELL_COLORS.map((option) => ({ label: option.label, value: option.key }))} onChange={(value) => edit({ color: value as CellColor })} />
        </Card>
        <ActionButton label="儲存" onPress={save} />
      </> : <Body>找不到此課程，請返回課表。</Body>}
      <ActionButton label="取消" onPress={() => router.back()} />
    </Screen>
  );
}
