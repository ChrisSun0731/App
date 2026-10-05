// 編輯課程 (modal): the subject of one timetable slot (or its 單週 / 雙週
// subjects with 單雙週輪替 on), its note and its colour. Layout per
// docs/design/native-ui.md, "編輯課程 (/schedule-editor, modal)".
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { CELL_COLOR_OPTIONS, editorTitle, parseEditorTarget, subjectHint } from '@/features/schedule/editor';
import { describeCell, periodOverline } from '@/features/schedule/schedule-view';
import {
  cellFromDraft,
  draftFromCell,
  getWeekParity,
  setDraftRotating,
  type CellDraft,
} from '@/features/schedule/timetable';
import { useTimetables } from '@/features/schedule/use-timetables';
import { useScheduleStore } from '@/store/schedule';
import { usePalette } from '@/theme/palette';
import { EmptyState, ListScreen, PickerRow, Row, Section, TextFieldRow, ToggleRow } from '@/ui';

export default function ScheduleEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; day?: string }>();
  const target = parseEditorTarget(params);
  const cell = useScheduleStore((state) =>
    target ? state.rows.find((row) => row.name === target.period)?.[target.day] : undefined);
  const updateCell = useScheduleStore((state) => state.updateCell);
  const timetable = useTimetables();
  const { scheme } = usePalette();
  const [draft, setDraft] = useState(() => draftFromCell(cell ?? { subject: '' }));
  // The preview shows this week's subject of a rotating slot, as 課表 does.
  const [openedAt] = useState(() => new Date());
  const edit = (patch: Partial<CellDraft>) => setDraft((current) => ({ ...current, ...patch }));

  function close() {
    router.back();
  }

  function save() {
    if (!target || !cell) return;
    updateCell(target.period, target.day, cellFromDraft(draft));
    router.back();
  }

  // Android: a close icon in the full-screen modal's top app bar; iOS: 取消
  // as text in the sheet's navigation bar.
  const cancel: HeaderItem = process.env.EXPO_OS === 'android'
    ? { kind: 'icon', key: 'cancel', label: '取消', icon: icons.close, onPress: close }
    : { kind: 'text', key: 'cancel', label: '取消', onPress: close };

  const preview = target && cell
    ? describeCell(cellFromDraft(draft), {
      overline: `預覽 · ${periodOverline(target.period, timetable.data?.periods ?? [])}`,
      parity: getWeekParity(timetable.data?.semesterStart ?? null, openedAt),
      scheme,
    })
    : null;

  return (
    <>
      <Stack.Screen options={{ title: editorTitle(target) }} />
      <HeaderActions
        left={[cancel]}
        right={[{ kind: 'text', key: 'save', label: '儲存', prominent: true, disabled: !cell, onPress: save }]}
      />
      <ListScreen>
        {cell ? (
          <>
            <Section title="科目" footer={subjectHint(draft, cell.alternating)}>
              {/* The switch comes first, so turning it on or off changes the fields below it, not the row under the finger. */}
              <ToggleRow
                label="單雙週輪替"
                value={draft.rotating}
                onValueChange={(rotating) => setDraft((current) => setDraftRotating(current, rotating))}
              />
              {draft.rotating ? (
                <>
                  <TextFieldRow key="odd" label="單週科目" value={draft.odd} onChangeText={(odd) => edit({ odd })} />
                  <TextFieldRow key="even" label="雙週科目" value={draft.even} onChangeText={(even) => edit({ even })} />
                </>
              ) : (
                <TextFieldRow
                  key="subject"
                  label="科目"
                  value={draft.subject}
                  onChangeText={(subject) => edit({ subject })}
                />
              )}
            </Section>

            <Section title="備註">
              <TextFieldRow label="備註" value={draft.note} onChangeText={(note) => edit({ note })} multiline />
            </Section>

            <Section title="顏色">
              <PickerRow label="顏色" value={draft.color} options={CELL_COLOR_OPTIONS} onChange={(color) => edit({ color })} />
              {/* The kit's menu pickers show text only, so the fill is previewed as 課表 will draw it (light or dark). */}
              {preview ? (
                <Row
                  overline={preview.overline}
                  title={preview.title}
                  subtitle={preview.subtitle}
                  background={preview.background}
                  accessibilityLabel={preview.accessibilityLabel}
                />
              ) : null}
            </Section>
          </>
        ) : (
          <Section plain>
            <EmptyState
              icon={icons.book}
              title="找不到此課程"
              description="請返回課表。"
              action={{ label: '返回課表', onPress: close }}
            />
          </Section>
        )}
      </ListScreen>
    </>
  );
}
