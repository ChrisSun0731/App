// /categories?kind=todo|event (modal): the 待辦 or 活動 categories, deleted
// with a row action and added at the bottom. Changes apply at once, so the
// header only has 完成. Layout per docs/design/native-ui.md, "類別管理".
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import {
  ADD_CATEGORY_FAILED,
  categoryKind,
  colorOptions,
  DUPLICATE_CATEGORY,
  EVENT_COLORS,
  eventCategoryProblem,
} from '@/features/todo/categories';
import { doneHeader } from '@/navigation/modal-header';
import { useTodoStore } from '@/store/todo';
import { ButtonRow, ListScreen, PickerRow, Row, Section, TextBlock, TextFieldRow, type RowAction } from '@/ui';

// iOS keeps 刪除 in each row's swipe actions and long-press menu, which
// nothing on screen reveals; Android shows an overflow button on every row.
const DELETE_HINT = process.env.EXPO_OS === 'ios' ? '左滑或長按類別即可刪除。' : '';

function deleteAction(onDelete: () => void, message: string): RowAction {
  return {
    key: 'delete',
    label: '刪除',
    icon: icons.delete,
    destructive: true,
    onPress: () =>
      Alert.alert('刪除類別', message, [
        { text: '取消', style: 'cancel' },
        { text: '刪除', style: 'destructive', onPress: onDelete },
      ]),
  };
}

export default function CategoriesScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return (
    <>
      <HeaderActions {...doneHeader(() => router.back())} />
      {categoryKind(kind) === 'event' ? <EventCategories /> : <TodoCategories />}
    </>
  );
}

function EventCategories() {
  const categories = useTodoStore((state) => state.eventCategories);
  const addEventCategory = useTodoStore((state) => state.addEventCategory);
  const deleteEventCategory = useTodoStore((state) => state.deleteEventCategory);
  const [name, setName] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0].value);

  function add() {
    // A stray space around a typed code is not worth refusing it for.
    const code = color.trim();
    const problem = eventCategoryProblem(name, code);
    if (problem) {
      Alert.alert(ADD_CATEGORY_FAILED, problem);
      return;
    }
    if (!addEventCategory({ name, color: code })) {
      Alert.alert(ADD_CATEGORY_FAILED, DUPLICATE_CATEGORY);
      return;
    }
    setName('');
  }

  return (
    <ListScreen>
      <Section title="活動類別" footer={`至少保留一個活動類別。${categories.length > 1 ? DELETE_HINT : ''}`}>
        {categories.map((category) => (
          <Row
            key={category.name}
            title={category.name}
            dotColor={category.color}
            // The last category stays (the store refuses it too).
            actions={
              categories.length > 1
                ? [deleteAction(() => deleteEventCategory(category.name), '已有活動會保留此類別的名稱與顏色。')]
                : undefined
            }
          />
        ))}
      </Section>

      <Section title="新增類別">
        <TextFieldRow label="新類別名稱" value={name} onChangeText={setName} />
        <PickerRow label="顏色" icon={icons.palette} value={color} options={colorOptions(color)} onChange={setColor} />
        <TextFieldRow
          label="自訂色碼 (#RRGGBB)"
          value={color}
          onChangeText={setColor}
          // The URL keyboard turns off autocapitalisation and autocorrect,
          // which would otherwise "fix" a code like #c62828.
          keyboard="url"
        />
        <ButtonRow label="新增類別" icon={icons.add} disabled={!name.trim()} onPress={add} />
      </Section>
    </ListScreen>
  );
}

function TodoCategories() {
  const categories = useTodoStore((state) => state.todoCategories);
  const addTodoCategory = useTodoStore((state) => state.addTodoCategory);
  const deleteTodoCategory = useTodoStore((state) => state.deleteTodoCategory);
  const [name, setName] = useState('');

  function add() {
    if (!addTodoCategory(name)) {
      Alert.alert(ADD_CATEGORY_FAILED, DUPLICATE_CATEGORY);
      return;
    }
    setName('');
  }

  return (
    <ListScreen>
      <Section title="待辦類別" footer={categories.length > 0 && DELETE_HINT ? DELETE_HINT : undefined}>
        {categories.length === 0 ? <TextBlock text="尚未建立類別。" secondary /> : null}
        {categories.map((category) => (
          <Row
            key={category.name}
            title={category.name}
            actions={[deleteAction(() => deleteTodoCategory(category.name), '已有待辦會保留此類別的名稱。')]}
          />
        ))}
      </Section>

      <Section title="新增類別">
        <TextFieldRow label="新類別名稱" value={name} onChangeText={setName} />
        <ButtonRow label="新增類別" icon={icons.add} disabled={!name.trim()} onPress={add} />
      </Section>
    </ListScreen>
  );
}
