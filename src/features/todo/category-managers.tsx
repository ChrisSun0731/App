import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ActionButton, Body, Card, Field, Title } from '@/components/ui/page';
import { useTodoStore } from '@/store/todo';

import { ChoiceField } from './form-controls';
import { SCHOOL_EVENT_CATEGORY } from './school-calendar';

const COLORS = [
  { label: '灰色', value: '#ADADAD' },
  { label: '紅色', value: '#C62828' },
  { label: '橙色', value: '#EF6C00' },
  { label: '綠色', value: '#2E7D32' },
  { label: '藍色', value: '#1565C0' },
  { label: '紫色', value: '#7B1FA2' },
];

export function EventCategoryManager() {
  const { eventCategories, addEventCategory, deleteEventCategory } = useTodoStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);

  function add() {
    if (name.trim() === SCHOOL_EVENT_CATEGORY.name) {
      Alert.alert('無法新增類別', '「學校事務」是學校行事曆專用類別。');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      Alert.alert('無法新增類別', '請選擇顏色或輸入 #RRGGBB 格式的色碼。');
      return;
    }
    if (!addEventCategory({ name, color })) {
      Alert.alert('無法新增類別', '請填寫名稱，且不要與現有類別重複。');
      return;
    }
    setName('');
  }

  return <Card>
    <Title>活動類別</Title>
    {eventCategories.map((category) => <View key={category.name} style={{ gap: 4 }}>
      <Body>{category.name}</Body>
      <ActionButton label={`刪除「${category.name}」`} destructive disabled={eventCategories.length <= 1} onPress={() => {
        Alert.alert('刪除類別', '已有活動會保留此類別的名稱與顏色。', [
          { text: '取消', style: 'cancel' },
          { text: '刪除', style: 'destructive', onPress: () => deleteEventCategory(category.name) },
        ]);
      }} />
    </View>)}
    <Field label="新類別名稱" value={name} onChangeText={setName} />
    <ChoiceField label="顏色" value={color} options={COLORS.some((option) => option.value === color) ? COLORS : [...COLORS, { label: '自訂顏色', value: color }]} onChange={setColor} />
    <Field label="自訂色碼 (#RRGGBB)" value={color} onChangeText={setColor} />
    <ActionButton label="新增類別" onPress={add} disabled={!name.trim()} />
    <Body secondary>至少保留一個活動類別。</Body>
  </Card>;
}

export function TodoCategoryManager() {
  const { todoCategories, addTodoCategory, deleteTodoCategory } = useTodoStore();
  const [name, setName] = useState('');

  function add() {
    if (!addTodoCategory(name)) {
      Alert.alert('無法新增類別', '請填寫名稱，且不要與現有類別重複。');
      return;
    }
    setName('');
  }

  return <Card>
    <Title>待辦類別</Title>
    {todoCategories.length === 0 && <Body secondary>尚未建立類別。</Body>}
    {todoCategories.map((category) => <View key={category.name} style={{ gap: 4 }}>
      <Body>{category.name}</Body>
      <ActionButton label={`刪除「${category.name}」`} destructive onPress={() => {
        Alert.alert('刪除類別', '已有待辦會保留此類別的名稱。', [
          { text: '取消', style: 'cancel' },
          { text: '刪除', style: 'destructive', onPress: () => deleteTodoCategory(category.name) },
        ]);
      }} />
    </View>)}
    <Field label="新類別名稱" value={name} onChangeText={setName} />
    <ActionButton label="新增類別" onPress={add} disabled={!name.trim()} />
  </Card>;
}
