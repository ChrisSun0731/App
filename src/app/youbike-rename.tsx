// /youbike-rename?city&sna (modal): the nickname a followed YouBike station
// shows on 交通. Saving an empty nickname restores the station's name (the
// store's rule), which the placeholder shows. Layout per
// docs/design/native-ui.md, "交通 (Transport)".
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { formHeader } from '@/features/todo/editor-header';
import { CITIES, stationDisplayName } from '@/features/transport/youbike';
import { useTransportStore } from '@/store/transport';
import { EmptyState, ListScreen, Section, TextFieldRow } from '@/ui';

function close() {
  router.back();
}

export default function YoubikeRename() {
  const params = useLocalSearchParams<{ city?: string; sna?: string }>();
  const city = CITIES.find((item) => item === params.city);
  const follow = useTransportStore((state) =>
    state.youbike.find((station) => station.city === city && station.sna === params.sna));
  const renameYoubike = useTransportStore((state) => state.renameYoubike);
  const [nickname, setNickname] = useState(follow?.nickname ?? '');

  function save() {
    if (!follow) return;
    renameYoubike(follow.sna, nickname, follow.city);
    close();
  }

  return (
    <>
      <HeaderActions {...formHeader(close, save, follow !== undefined)} />
      <ListScreen>
        {follow ? (
          <Section footer={`${follow.city} · ${stationDisplayName(follow.sna)}`}>
            <TextFieldRow
              label="暱稱"
              value={nickname}
              onChangeText={setNickname}
              placeholder={stationDisplayName(follow.sna)}
              autoFocus
            />
          </Section>
        ) : (
          <Section plain>
            <EmptyState
              icon={icons.bike}
              title="找不到此站點"
              description="站點可能已從交通頁面移除。"
              action={{ label: '返回交通', onPress: close }}
            />
          </Section>
        )}
      </ListScreen>
    </>
  );
}
