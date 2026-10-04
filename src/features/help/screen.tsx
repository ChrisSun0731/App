import { useState } from 'react';

import { ActionButton, Body, Card, Field, Screen, Title } from '@/components/ui/page';

export default function HelpScreen() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const options = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return <Screen>
    <Card>
      <Title>今天選哪個？</Title>
      <Body secondary>每行輸入一個選項，讓小幫手替你選擇。</Body>
      <Field label="選項" value={text} onChangeText={(value) => { setText(value); setResult(''); }} multiline />
      <ActionButton label={result ? '再選一次' : '幫我選'} disabled={options.length === 0}
        onPress={() => setResult(options[Math.floor(Math.random() * options.length)])} />
    </Card>
    {result ? <Card><Title>就選這個</Title><Body>{result}</Body></Card> : null}
  </Screen>;
}
