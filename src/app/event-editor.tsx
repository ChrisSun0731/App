import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ActionButton, Body, Card, Field, Screen } from '@/components/ui/page';
import { EventCategoryManager } from '@/features/todo/category-managers';
import { ChoiceField, DateField } from '@/features/todo/form-controls';
import { isSchoolEvent } from '@/features/todo/school-calendar';
import { DEFAULT_EVENT_CATEGORY } from '@/features/todo/types';
import { isDateKey, toDateKey } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';

export default function EventEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const { events, eventCategories, addEvent, updateEvent, deleteEvent } = useTodoStore();
  const event = events.find((item) => item.id === params.id);
  const initialDate = isDateKey(params.date) ? params.date : toDateKey(new Date());
  const [title, setTitle] = useState(event?.title ?? '');
  const [startDate, setStartDate] = useState(event?.startDate ?? initialDate);
  const [endDate, setEndDate] = useState(event?.endDate ?? initialDate);
  const [categoryName, setCategoryName] = useState(event?.category.name ?? eventCategories[0]?.name ?? DEFAULT_EVENT_CATEGORY.name);
  const [manageCategories, setManageCategories] = useState(false);
  const categories = [...eventCategories];
  if (event && !categories.some((category) => category.name === event.category.name)) categories.push(event.category);
  const selectedCategory = categories.find((category) => category.name === categoryName) ?? categories[0];
  const validDates = endDate >= startDate;
  const missing = !!params.id && !event;
  const readonly = event ? isSchoolEvent(event) : false;

  function save() {
    if (!title.trim() || !validDates || !selectedCategory || readonly || missing) return;
    const values = { title: title.trim(), startDate, endDate, category: selectedCategory };
    if (event) updateEvent({ ...event, ...values });
    else addEvent(values);
    router.back();
  }

  function remove() {
    if (!event || readonly) return;
    Alert.alert('刪除活動', `確定刪除「${event.title}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => { deleteEvent(event.id); router.back(); } },
    ]);
  }

  return <Screen>
    <Stack.Screen options={{ title: event ? '編輯活動' : '新增活動' }} />
    {missing ? <Body>找不到此活動，請返回行事曆。</Body> : readonly ? <Body>學校活動僅供查看，無法修改。</Body> : <>
      <Card>
        <Field label="活動標題" value={title} onChangeText={setTitle} />
        <DateField label="起始日期" value={startDate} onChange={(value) => { setStartDate(value); if (endDate < value) setEndDate(value); }} />
        <DateField label="結束日期" value={endDate} onChange={setEndDate} minimumDate={startDate} />
        {!validDates && <Body>結束日期不能早於起始日期。</Body>}
        <ChoiceField label="活動類別" value={selectedCategory?.name ?? ''} options={categories.map((category) => ({ label: category.name, value: category.name }))} onChange={setCategoryName} />
        <ActionButton label={manageCategories ? '關閉類別管理' : '管理活動類別'} onPress={() => setManageCategories(!manageCategories)} />
      </Card>
      {manageCategories && <EventCategoryManager />}
      {!selectedCategory && <Body secondary>此類別已移除，請重新選擇。</Body>}
      <ActionButton label="儲存" onPress={save} disabled={!title.trim() || !validDates || !selectedCategory} />
      {event && <ActionButton label="刪除活動" destructive onPress={remove} />}
    </>}
    <ActionButton label="取消" onPress={() => router.back()} />
  </Screen>;
}
