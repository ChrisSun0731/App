// 行事曆 › 待辦: every todo grouped by date (overdue groups flagged, undated
// last), filtered by category, with 管理待辦類別. Pushed from 行事曆's 所有待辦
// row. Layout per docs/design/native-ui.md, "行事曆 (Todo)".
import { router } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useTodoStore } from '@/store/todo';
import { ButtonRow, CheckRow, ListScreen, PickerRow, Section, TextBlock } from '@/ui';

import { ALL_TODOS, effectiveFilter, filterTodos, todoFilterOptions, todoSections } from './calendar-view';
import { completeTodo, editTodo, todoActions, todoSubtitle } from './todo-rows';

export default function TodoListScreen() {
  const todos = useTodoStore((state) => state.todos);
  const todoCategories = useTodoStore((state) => state.todoCategories);
  // Not persisted, as before: the list opens on every todo.
  const [filter, setFilter] = useState(ALL_TODOS);
  const activeFilter = effectiveFilter(filter, todos, todoCategories);
  const sections = todoSections(filterTodos(todos, activeFilter), new Date());

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
        <Section footer="勾選待辦即完成並移除。">
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
                checked={false}
                onCheckedChange={(checked) => completeTodo(todo, checked)}
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
