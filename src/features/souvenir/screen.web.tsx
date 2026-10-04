import { ActionButton, Body, Card, Screen, Title } from '@/components/ui/page';
import { openWebsite } from '@/lib/open-link';

export default function SouvenirScreen() {
  return <Screen><Card><Title>校慶紀念品</Title><Body>今日我以建中為榮，明日建中以我為榮。</Body>
    <ActionButton label="前往紀念品商店" onPress={() => { void openWebsite('https://souvenir.cksc.tw/auth'); }} />
  </Card></Screen>;
}
