// /metro-picker (modal): follow Metro stations, line by line, filtered by the
// header search field. Tapping a station follows it at once and removal
// stays on 交通, so the header only has 完成. Layout per
// docs/design/native-ui.md, "交通 (Transport)".
import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { doneHeader } from '@/features/todo/editor-header';
import {
  METRO_LINE_COLORS,
  METRO_LINE_NAMES,
  METRO_LINES,
  stationsOnLine,
  type MetroLine,
} from '@/features/transport/metro-lines';
import { searchMetroStations } from '@/features/transport/transport-view';
import { usePickerSearch } from '@/features/transport/use-picker-search';
import { useTransportStore } from '@/store/transport';
import { ListScreen, PickerRow, Row, Section, TextBlock, type ChoiceOption } from '@/ui';

// Line codes, as before: six full line names do not fit one segmented control.
const LINE_OPTIONS: readonly ChoiceOption<MetroLine>[] = METRO_LINES.map((line) => ({ label: line, value: line }));
// Rows carry no add button; only a checkmark once added. Say what a tap does.
const ADD_HINT = '點選車站即可加入。';

function close() {
  router.back();
}

export default function MetroPicker() {
  const followed = useTransportStore((state) => state.metro);
  const addMetro = useTransportStore((state) => state.addMetro);
  const [line, setLine] = useState<MetroLine>(METRO_LINES[0]);
  // The query is kept across lines: a station name can be searched line by line.
  const { query, searchBarProps } = usePickerSearch();

  const stations = searchMetroStations(stationsOnLine(line), query);

  return (
    <>
      <HeaderActions {...doneHeader(close)} />
      <Stack.SearchBar placeholder="搜尋車站" {...searchBarProps} />
      <ListScreen>
        <Section plain>
          <PickerRow label="路線" variant="segmented" value={line} options={LINE_OPTIONS} onChange={setLine} />
        </Section>

        <Section title={METRO_LINE_NAMES[line]} footer={ADD_HINT}>
          {stations.length === 0 ? <TextBlock text="此路線沒有符合的車站。" secondary /> : null}
          {stations.map((station) => {
            const added = followed.includes(station);
            return (
              <Row
                key={station}
                title={station}
                dotColor={METRO_LINE_COLORS[line]}
                accessory={added ? 'checkmark' : 'none'}
                onPress={added ? undefined : () => addMetro(station)}
              />
            );
          })}
        </Section>
      </ListScreen>
    </>
  );
}
