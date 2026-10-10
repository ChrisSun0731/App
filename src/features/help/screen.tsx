import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { icons } from '@/components/icons';
import { ButtonRow, ListScreen, Section, TextBlock, TextFieldRow } from '@/ui';

/** One option per line; blank lines are ignored. */
function parseOptions(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

export default function HelpScreen() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const options = parseOptions(text);

  function edit(value: string) {
    setText(value);
    // A pick from the old list no longer answers the new one.
    setResult('');
  }

  function pick() {
    const choice = options[Math.floor(Math.random() * options.length)];
    setResult(choice);
    // The answer appears below the button, away from focus; say it too.
    AccessibilityInfo.announceForAccessibility(`就選這個：${choice}`);
  }

  return (
    <ListScreen>
      <Section title="今天選哪個？" footer="每行輸入一個選項，讓小幫手替你選擇。">
        <TextFieldRow label="選項" value={text} onChangeText={edit} multiline />
      </Section>

      <Section plain>
        <ButtonRow
          label={result ? '再選一次' : '幫我選'}
          icon={icons.dice}
          prominent
          disabled={options.length === 0}
          onPress={pick}
        />
      </Section>

      {result ? (
        <Section title="就選這個">
          <TextBlock text={result} size="large" selectable />
        </Section>
      ) : null}
    </ListScreen>
  );
}
