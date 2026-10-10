// 行事曆 › 待辦: every todo grouped by date (overdue groups flagged, undated
// last), filtered by category, with 管理待辦類別. Pushed from 行事曆's 所有待辦
// row. Layout per docs/design/native-ui.md, "行事曆 (Todo)". A todo checked
// off stays, checked, until the day ends (todo-state.ts).
import { router } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useTodoStore } from '@/store/todo';
import { ButtonRow, CheckRow, ListScreen, PickerRow, Section, TextBlock } from '@/ui';

import { ALL_TODOS, effectiveFilter, filterTodos, todoFilterOptions, todoSections } from './calendar-view';
import { editTodo, todoActions, todoSubtitle, toggleTodo } from './todo-rows';
import { isCompleted, visibleTodos } from './todo-state';

export default function TodoListScreen() {
  const allTodos = useTodoStore((state) => state.todos);
  const todoCategories = useTodoStore((state) => state.todoCategories);
  const today = new Date();
  const todos = visibleTodos(allTodos, today);
  // Not persisted, as before: the list opens on every todo.
  const [filter, setFilter] = useState(ALL_TODOS);
  const activeFilter = effectiveFilter(filter, todos, todoCategories);
  const sections = todoSections(filterTodos(todos, activeFilter), today);

  return (
    <>
      <HeaderActions
        right={[
          {
            kind: 'icon',
            key: 'add',
            label: '新增待辦',
            icon: icons.add,
            onPress: () => router.push('/todo-editor'),
          },
        ]}
      />
      <ListScreen fab={{ label: '新增待辦', icon: icons.add, onPress: () => router.push('/todo-editor') }}>
        <Section footer="勾選待辦即完成；已完成的待辦會顯示到當天結束。">
          <PickerRow
            label="顯示類別"
            icon={icons.label}
            value={activeFilter}
            options={todoFilterOptions(todos, todoCategories)}
            onChange={setFilter}
          />
          <ButtonRow
            label="管理待辦類別"
            icon={icons.folder}
            onPress={() => router.push({ pathname: '/categories', params: { kind: 'todo' } })}
          />
        </Section>

        {sections.length === 0 ? (
          <Section>
            <TextBlock text="目前沒有待辦事項。" secondary />
          </Section>
        ) : null}
        {sections.map((section) => (
          <Section key={section.key} title={section.title} footer={section.overdue ? '已過期' : undefined}>
            {section.todos.map((todo) => (
              <CheckRow
                key={todo.id}
                title={todo.title}
                subtitle={todoSubtitle(todo)}
                checked={isCompleted(todo)}
                onCheckedChange={(checked) => toggleTodo(todo, checked)}
                onPress={() => editTodo(todo)}
                actions={todoActions(todo)}
              />
            ))}
          </Section>
        ))}
      </ListScreen>
    </>
  );
}
