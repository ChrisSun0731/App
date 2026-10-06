// 編輯課程 (modal): the subject of one timetable slot (or its 單週 / 雙週
// subjects with 單雙週輪替 on), its note and its colour. Layout per
// docs/design/native-ui.md, "編輯課程 (/schedule-editor, modal)".
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import {
  CELL_COLOR_OPTIONS,
  editorTitle,
  parseEditorTarget,
  subjectHint,
  type EditorTarget,
} from '@/features/schedule/editor';
import { describeCell, periodOverline } from '@/features/schedule/schedule-view';
import {
  cellFromDraft,
  draftFromCell,
  getWeekParity,
  setDraftRotating,
  type CellDraft,
  type ScheduleCell,
} from '@/features/schedule/timetable';
import { useTimetables } from '@/features/schedule/use-timetables';
import { doneHeader, formHeader } from '@/features/todo/editor-header';
import { useScheduleStore } from '@/store/schedule';
import { usePalette } from '@/theme/palette';
import { EmptyState, ListScreen, PickerRow, Row, Section, TextFieldRow, ToggleRow } from '@/ui';

export default function ScheduleEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; day?: string }>();
  const target = parseEditorTarget(params);
  const cell = useScheduleStore((state) =>
    target ? state.rows.find((row) => row.name === target.period)?.[target.day] : undefined);

  function close() {
    router.back();
  }

  if (!target || !cell) {
    // Nothing to save, so no form chrome: just a way back.
    return (
      <>
        <Stack.Screen options={{ title: editorTitle(target) }} />
        <HeaderActions {...doneHeader(close)} />
        <ListScreen>
          <Section plain>
            <EmptyState
              icon={icons.book}
              title="找不到此課程"
              description="請返回課表。"
              action={{ label: '返回課表', onPress: close }}
            />
          </Section>
        </ListScreen>
      </>
    );
  }

  // Mounted only once the slot exists, so the draft starts from the real cell.
  // A deep link opened before the timetable is filled would otherwise seed an
  // empty draft that 儲存 writes over the imported slot.
  return <CellForm key={`${target.period}-${target.day}`} target={target} cell={cell} onClose={close} />;
}

function CellForm({ target, cell, onClose }: { target: EditorTarget; cell: ScheduleCell; onClose: () => void }) {
  const updateCell = useScheduleStore((state) => state.updateCell);
  const timetable = useTimetables();
  const { scheme } = usePalette();
  const [draft, setDraft] = useState(() => draftFromCell(cell));
  // The preview shows this week's subject of a rotating slot, as 課表 does.
  const [openedAt] = useState(() => new Date());
  const edit = (patch: Partial<CellDraft>) => setDraft((current) => ({ ...current, ...patch }));

  function save() {
    updateCell(target.period, target.day, cellFromDraft(draft));
    onClose();
  }

  const preview = describeCell(cellFromDraft(draft), {
    overline: `預覽 · ${periodOverline(target.period, timetable.data?.periods ?? [])}`,
    parity: getWeekParity(timetable.data?.semesterStart ?? null, openedAt),
    scheme,
  });

  return (
    <>
      <Stack.Screen options={{ title: editorTitle(target) }} />
      <HeaderActions {...formHeader(onClose, save, true)} />
      <ListScreen>
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
            <TextFieldRow key="subject" label="科目" value={draft.subject} onChangeText={(subject) => edit({ subject })} />
          )}
        </Section>

        <Section title="備註">
          {/* An example rather than the label again: the section title already says 備註. */}
          <TextFieldRow
            label="備註"
            value={draft.note}
            onChangeText={(note) => edit({ note })}
            placeholder="例如：帶課本、換教室"
            multiline
          />
        </Section>

        <Section title="顏色">
          <PickerRow label="顏色" value={draft.color} options={CELL_COLOR_OPTIONS} onChange={(color) => edit({ color })} />
          {/* The kit's menu pickers show text only, so the fill is previewed as 課表 will draw it (light or dark). */}
          <Row
            overline={preview.overline}
            title={preview.title}
            subtitle={preview.subtitle}
            background={preview.background}
            accessibilityLabel={preview.accessibilityLabel}
          />
        </Section>
      </ListScreen>
    </>
  );
}
