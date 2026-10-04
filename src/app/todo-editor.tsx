import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ActionButton, Body, Card, Field, Screen, Toggle } from '@/components/ui/page';
import { TodoCategoryManager } from '@/features/todo/category-managers';
import { ChoiceField, DateField } from '@/features/todo/form-controls';
import { isDateKey, toDateKey } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';

export default function TodoEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const { todos, todoCategories, addTodo, updateTodo, deleteTodo } = useTodoStore();
  const todo = todos.find((item) => item.id === params.id);
  const [title, setTitle] = useState(todo?.title ?? '');
  const [dated, setDated] = useState(todo ? !!todo.date : !!params.date);
  const [date, setDate] = useState(todo?.date ?? (isDateKey(params.date) ? params.date : toDateKey(new Date())));
  const [categoryName, setCategoryName] = useState(todo?.category?.name ?? '');
  const [manageCategories, setManageCategories] = useState(false);
  const missing = !!params.id && !todo;
  const categories = [...todoCategories];
  if (todo?.category && !categories.some((category) => category.name === todo.category!.name)) categories.push(todo.category);

  const selectedCategory = categories.find((category) => category.name === categoryName) ?? null;

  function save() {
    if (!title.trim() || missing) return;
    const values = { title: title.trim(), date: dated ? date : null, category: selectedCategory };
    if (todo) updateTodo({ ...todo, ...values });
    else addTodo(values);
    router.back();
  }

  function remove() {
    if (!todo) return;
    Alert.alert('刪除待辦', `確定刪除「${todo.title}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => { deleteTodo(todo.id); router.back(); } },
    ]);
  }

  return <Screen>
    <Stack.Screen options={{ title: todo ? '編輯待辦' : '新增待辦' }} />
    {missing ? <Body>找不到此待辦，請返回列表。</Body> : <>
      <Card>
        <Field label="待辦標題" value={title} onChangeText={setTitle} />
        <Toggle label="指定日期" value={dated} onChange={setDated} />
        {dated && <DateField label="日期" value={date} onChange={setDate} />}
        <ChoiceField label="待辦類別" value={selectedCategory?.name ?? ''} options={[{ label: '無類別', value: '' }, ...categories.map((category) => ({ label: category.name, value: category.name }))]} onChange={setCategoryName} />
        <ActionButton label={manageCategories ? '關閉類別管理' : '管理待辦類別'} onPress={() => setManageCategories(!manageCategories)} />
      </Card>
      {manageCategories && <TodoCategoryManager />}
      <ActionButton label="儲存" onPress={save} disabled={!title.trim()} />
      {todo && <ActionButton label="刪除待辦" destructive onPress={remove} />}
    </>}
    <ActionButton label="取消" onPress={() => router.back()} />
  </Screen>;
}
