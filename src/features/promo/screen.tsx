import { ActionButton, Body, Card, Screen, Title } from '@/components/ui/page';
import { openWebsite } from '@/lib/open-link';

const AREAS = [
  ['官方網站', ''], ['建中地區', '/ckhs'], ['北車地區', '/taipeimainstation'],
  ['西門地區', '/ximen'], ['其他地區', '/other'],
] as const;

export default function PromoScreen() {
  return <Screen>
    <Card>
      <Title>建北特約</Title>
      <Body>特約店家會在店內明顯處張貼建北特約專用貼紙。</Body>
      <Body>使用優惠時，請出示學生證或教師證。店家可以拒絕僅穿著制服的使用者。</Body>
    </Card>
    <Card>
      <Title>尋找特約店家</Title>
      {AREAS.map(([label, path]) => <ActionButton key={label} label={label}
        onPress={() => { void openWebsite(`https://cktfgpromo.cksc.tw${path}`); }} />)}
    </Card>
  </Screen>;
}
