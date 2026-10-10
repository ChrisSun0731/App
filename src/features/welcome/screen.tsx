// 你是哪一班？: the first screen of a new install. The class decides 今天's
// card and 課表, so it is asked first, by grade; it can be skipped and
// changed later from 今天 (the class button opens 設定). Layout per
// docs/design/native-ui.md, "Welcome".
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTimetables } from '@/features/schedule/use-timetables';
import { GRADE_LABELS, gradeOfClass, type Grade } from '@/features/todo/school-days';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { ButtonRow, ChoiceGrid, ListScreen, Loading, Notice, PickerRow, Section, TextBlock } from '@/ui';

const GRADE_OPTIONS = ([1, 2, 3] as const).map((grade) => ({ label: GRADE_LABELS[grade], value: String(grade) }));

export default function WelcomeScreen() {
  const timetable = useTimetables();
  const current = useScheduleStore((state) => state.userClass);
  const [grade, setGrade] = useState<Grade>(() => gradeOfClass(current) ?? 1);
  const [chosen, setChosen] = useState<string | null>(null);

  // Save the open question as soon as the screen shows. The legacy import can
  // still land while this screen is up (after the splash timeout, see
  // features/legacy-import/legacy-importer.tsx) and writes the stores, so an
  // install killed before answering would otherwise relaunch with saved state
  // and no flag, which the merge in src/store/settings.ts takes for an upgrade
  // from before this screen: the question would never be asked. With false
  // saved here, that inference only ever sees storage that really predates the
  // flag. (Unless answered meanwhile: the import sets true when the previous
  // app knew the class, and this screen then leaves, below.)
  useEffect(() => {
    const settings = useSettingsStore.getState();
    if (!settings.welcomed) settings.setWelcomed(false);
  }, []);

  // On to 今天, once: 先看看, 開始使用 and the effect below can each get here
  // first, since the import can land during the exit.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    useSettingsStore.getState().setWelcomed(true);
    router.replace('/(tabs)/home');
  }, []);

  // The import landing while this screen is up sets the class the previous
  // app knew: the question is answered, so leave as if the reader had been in
  // time. Staying would let 開始使用 replace the imported timetable, notes and
  // colours included, with the bundled one, unasked.
  useEffect(() => {
    if (current !== '') leave();
  }, [current, leave]);

  const classes = timetable.data?.classIds.filter((id) => gradeOfClass(id) === grade) ?? [];

  function start() {
    const rows = chosen ? timetable.data?.byClass[chosen] : undefined;
    if (!chosen || !rows) return;
    const schedule = useScheduleStore.getState();
    // Unless the import answered during the exit (effect above): the previous
    // app's timetable stands over the bundled one.
    if (schedule.userClass === '') schedule.setClass(chosen, rows);
    leave();
  }

  return (
    <ListScreen>
      <Section plain>
        <TextBlock text="你是哪一班？" size="title" brandMark />
        <TextBlock text="選好班級，就能看到今天的課。之後可以在「今天」右上角更改。班級只存在這支手機上。" secondary />
      </Section>
      <Section plain>
        <PickerRow
          variant="segmented"
          label="年級"
          value={String(grade)}
          options={GRADE_OPTIONS}
          onChange={(value) => {
            setGrade(Number(value) as Grade);
            setChosen(null);
          }}
        />
      </Section>
      <Section plain>
        {timetable.data ? (
          <ChoiceGrid
            options={classes.map((id) => ({ label: id, value: id }))}
            value={chosen}
            onChange={setChosen}
            accessibilityLabel="班級"
          />
        ) : timetable.isError ? (
          <Notice
            tone="error"
            title="無法載入班級列表"
            message="請連線後重試，或先看看。"
            action={{ label: '重試', onPress: () => void timetable.refetch() }}
          />
        ) : (
          <Loading label="正在載入班級…" />
        )}
      </Section>
      <Section plain>
        <ButtonRow label="開始使用" prominent disabled={!chosen} onPress={start} />
        <ButtonRow label="先看看，之後再選" onPress={leave} />
      </Section>
    </ListScreen>
  );
}
