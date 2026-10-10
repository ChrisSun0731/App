// 你是哪一班？: the first screen of a new install. The class decides 今天's
// card and 課表, so it is asked first, by grade; it can be skipped and
// changed later from 今天 (the class button opens 設定). Layout per
// docs/design/native-ui.md, "Welcome".
import { router } from 'expo-router';
import { useState } from 'react';

import { useTimetables } from '@/features/schedule/use-timetables';
import { GRADE_LABELS, gradeOfClass, type Grade } from '@/features/todo/school-days';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { ButtonRow, ChoiceGrid, ListScreen, Loading, Notice, PickerRow, Section, TextBlock } from '@/ui';

const GRADE_OPTIONS = ([1, 2, 3] as const).map((grade) => ({ label: GRADE_LABELS[grade], value: String(grade) }));

function done() {
  useSettingsStore.getState().setWelcomed(true);
  router.replace('/(tabs)/home');
}

export default function WelcomeScreen() {
  const timetable = useTimetables();
  const current = useScheduleStore((state) => state.userClass);
  const [grade, setGrade] = useState<Grade>(() => gradeOfClass(current) ?? 1);
  const [chosen, setChosen] = useState<string | null>(null);

  const classes = timetable.data?.classIds.filter((id) => gradeOfClass(id) === grade) ?? [];

  function start() {
    const rows = chosen ? timetable.data?.byClass[chosen] : undefined;
    if (!chosen || !rows) return;
    useScheduleStore.getState().setClass(chosen, rows);
    done();
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
        <ButtonRow label="先看看，之後再選" onPress={done} />
      </Section>
    </ListScreen>
  );
}
