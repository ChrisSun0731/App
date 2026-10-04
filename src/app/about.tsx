import Constants from 'expo-constants';

import { ActionButton, Body, Card, Screen, Title } from '@/components/ui/page';
import { openEmail, openWebsite } from '@/lib/open-link';

export default function AboutScreen() {
  return <Screen>
    <Card><Title>CK APP</Title><Body>你的校園助理</Body><Body secondary>版本 {Constants.expoConfig?.version ?? '5.0.0'}</Body></Card>
    <Card><Title>關於這個 APP</Title>
      <Body>由 Diego Peng 與 Kimi Yang 於 2024 年開發，幫助建中生解決生活中的大小困難。</Body>
      <Body>班聯會資訊股自 2025 年 10 月起負責維護與更新。歡迎提供使用建議。</Body>
    </Card>
    <Card><Title>聯絡我們</Title>
      <ActionButton label="CK APP 電子郵件" onPress={() => { void openEmail('ckappofficial@gmail.com'); }} />
      <ActionButton label="班聯會電子郵件" onPress={() => { void openEmail('ckhssc@gl.ck.tp.edu.tw'); }} />
      <ActionButton label="CK APP Instagram" onPress={() => { void openWebsite('https://www.instagram.com/ckappofficial/'); }} />
      <ActionButton label="官方網站" onPress={() => { void openWebsite('https://ckapp-tw.web.app/'); }} />
    </Card>
  </Screen>;
}
