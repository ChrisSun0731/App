import { icons } from '@/components/icons';
import { openWebsite } from '@/lib/open-link';
import { ListScreen, Row, Section, TextBlock } from '@/ui';

const PROMO_SITE = 'https://cktfgpromo.cksc.tw';

const LINKS = [
  { label: '官方網站', path: '', icon: icons.store },
  { label: '建中地區', path: '/ckhs', icon: icons.mapPin },
  { label: '北車地區', path: '/taipeimainstation', icon: icons.mapPin },
  { label: '西門地區', path: '/ximen', icon: icons.mapPin },
  { label: '其他地區', path: '/other', icon: icons.mapPin },
] as const;

export default function PromoScreen() {
  return (
    <ListScreen>
      <Section title="建北特約">
        <TextBlock text="特約店家會在店內明顯處張貼建北特約專用貼紙。" selectable />
        <TextBlock text="使用優惠時，請出示學生證或教師證。店家可以拒絕僅穿著制服的使用者。" selectable />
      </Section>

      <Section title="尋找特約店家">
        {LINKS.map(({ label, path, icon }) => (
          <Row
            key={label}
            title={label}
            icon={icon}
            accessory="external"
            onPress={() => {
              void openWebsite(`${PROMO_SITE}${path}`);
            }}
          />
        ))}
      </Section>
    </ListScreen>
  );
}
