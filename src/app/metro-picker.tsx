// /metro-picker (modal): follow Metro stations, line by line, filtered by the
// header search field. Tapping a station follows it at once and removal
// stays on 交通, so the header only has 完成. Layout per
// docs/design/native-ui.md, "交通 (Transport)".
import { router, Stack } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';

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
import { useTransportStore } from '@/store/transport';
import { ListScreen, PickerRow, Row, Section, TextBlock, type ChoiceOption } from '@/ui';

type SearchTextHandler = NonNullable<ComponentProps<typeof Stack.SearchBar>['onChangeText']>;

// Line codes, as before: six full line names do not fit one segmented control.
const LINE_OPTIONS: readonly ChoiceOption<MetroLine>[] = METRO_LINES.map((line) => ({ label: line, value: line }));

function close() {
  router.back();
}

export default function MetroPicker() {
  const followed = useTransportStore((state) => state.metro);
  const addMetro = useTransportStore((state) => state.addMetro);
  const [line, setLine] = useState<MetroLine>(METRO_LINES[0]);
  const [query, setQuery] = useState('');

  // Stable, so the header search options are not registered again on every render.
  const onSearchText = useCallback<SearchTextHandler>((event) => setQuery(event.nativeEvent.text), []);
  const clearSearch = useCallback(() => setQuery(''), []);

  const stations = searchMetroStations(stationsOnLine(line), query);

  return (
    <>
      <HeaderActions {...doneHeader(close)} />
      <Stack.SearchBar
        placeholder="搜尋車站"
        // The sheet's List does not drive UIKit's scroll-to-reveal, so the
        // field stays visible instead of hiding under the bar.
        hideWhenScrolling={false}
        onChangeText={onSearchText}
        onCancelButtonPress={clearSearch}
        onClose={clearSearch}
      />
      <ListScreen>
        <Section plain>
          <PickerRow label="路線" variant="segmented" value={line} options={LINE_OPTIONS} onChange={setLine} />
        </Section>

        <Section title={METRO_LINE_NAMES[line]}>
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
