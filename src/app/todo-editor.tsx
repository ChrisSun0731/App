// /todo-editor (modal): new or existing todo. Layout per
// docs/design/native-ui.md, "待辦 / 活動 editors (modal)".
import { Stack, useLocalSearchParams } from 'expo-router';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { doneHeader, formHeader } from '@/features/todo/editor-header';
import { useTodoEditor } from '@/features/todo/use-todo-editor';
import {
  ButtonRow,
  DateRow,
  EmptyState,
  ListScreen,
  PickerRow,
  Section,
  TextFieldRow,
  ToggleRow,
} from '@/ui';

export default function TodoEditor() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editor = useTodoEditor(params);

  if (editor.missing) {
    return (
      <>
        <Stack.Screen options={{ title: '編輯待辦' }} />
        <HeaderActions {...doneHeader(editor.close)} />
        <ListScreen>
          <Section plain>
            <EmptyState icon={icons.help} title="找不到此待辦" description="請返回列表。" />
          </Section>
        </ListScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: editor.isNew ? '新增待辦' : '編輯待辦' }} />
      <HeaderActions {...formHeader(editor.close, editor.save, editor.canSave)} />
      <ListScreen>
        <Section>
          <TextFieldRow
            label="待辦標題"
            value={editor.title}
            onChangeText={editor.setTitle}
            // A new todo starts at its title, as in Reminders.
            autoFocus={editor.isNew}
          />
        </Section>

        <Section>
          <ToggleRow label="指定日期" value={editor.dated} onValueChange={editor.setDated} />
          {editor.dated ? <DateRow label="日期" value={editor.date} onChange={editor.setDate} /> : null}
        </Section>

        <Section>
          <PickerRow
            label="待辦類別"
            icon={icons.label}
            value={editor.categoryValue}
            options={editor.categoryOptions}
            onChange={editor.setCategoryName}
          />
          <ButtonRow label="管理待辦類別" icon={icons.folder} onPress={editor.manageCategories} />
        </Section>

        {editor.todo ? (
          <Section>
            <ButtonRow label="刪除待辦" icon={icons.delete} role="destructive" onPress={editor.remove} />
          </Section>
        ) : null}
      </ListScreen>
    </>
  );
}
