import Constants from 'expo-constants';

import { icons } from '@/components/icons';
import { openEmail, openWebsite } from '@/lib/open-link';
import { ListScreen, Row, Section, TextBlock, type IconValue } from '@/ui';

const VERSION = Constants.expoConfig?.version ?? '5.0.0';

const CONTACTS: readonly { title: string; subtitle: string; icon: IconValue; open: () => Promise<void> }[] = [
  { title: 'CK APP 電子郵件', subtitle: 'ckappofficial@gmail.com', icon: icons.mail, open: () => openEmail('ckappofficial@gmail.com') },
  { title: '班聯會電子郵件', subtitle: 'ckhssc@gl.ck.tp.edu.tw', icon: icons.mail, open: () => openEmail('ckhssc@gl.ck.tp.edu.tw') },
  {
    title: 'CK APP Instagram',
    subtitle: '@ckappofficial',
    icon: icons.camera,
    open: () => openWebsite('https://www.instagram.com/ckappofficial/'),
  },
  { title: '官方網站', subtitle: 'ckapp-tw.web.app', icon: icons.web, open: () => openWebsite('https://ckapp-tw.web.app/') },
];

export default function AboutScreen() {
  return (
    <ListScreen>
      <Section>
        <Row title="CK APP" subtitle="你的校園助理" detail={`版本 ${VERSION}`} icon={icons.school} />
      </Section>

      <Section title="關於這個 APP">
        <TextBlock text="由 Diego Peng 與 Kimi Yang 於 2024 年開發，幫助建中生解決生活中的大小困難。" selectable />
        <TextBlock text="班聯會資訊股自 2025 年 10 月起負責維護與更新。歡迎提供使用建議。" selectable />
      </Section>

      <Section title="聯絡我們">
        {CONTACTS.map((contact) => (
          <Row
            key={contact.title}
            title={contact.title}
            subtitle={contact.subtitle}
            icon={contact.icon}
            accessory="external"
            onPress={() => {
              void contact.open();
            }}
          />
        ))}
      </Section>
    </ListScreen>
  );
}
