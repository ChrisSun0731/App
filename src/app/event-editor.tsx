// /event-editor (modal): new or existing event; school events are shown
// read-only. Layout per docs/design/native-ui.md, "待辦 / 活動 editors (modal)".
import { Stack, useLocalSearchParams } from 'expo-router';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { doneHeader, formHeader } from '@/features/todo/editor-header';
import { useEventEditor } from '@/features/todo/use-event-editor';
import { formatFullDate, fromDateKey, isDateKey } from '@/lib/dates';
import {
  ButtonRow,
  DateRow,
  EmptyState,
  ListScreen,
  Notice,
  PickerRow,
  Row,
  Section,
  TextBlock,
  TextFieldRow,
} from '@/ui';

/** A stored date for a read-only row; imported data may not be a valid key. */
function dateText(key: string): string {
  return isDateKey(key) ? formatFullDate(fromDateKey(key)) : key;
}

export default function EventEditor() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editor = useEventEditor(params);
  const { event } = editor;

  if (editor.missing) {
    return (
      <>
        <Stack.Screen options={{ title: '編輯活動' }} />
        <HeaderActions {...doneHeader(editor.close)} />
        <ListScreen>
          <Section plain>
            <EmptyState icon={icons.help} title="找不到此活動" description="請返回行事曆。" />
          </Section>
        </ListScreen>
      </>
    );
  }

  if (event && editor.readOnly) {
    return (
      <>
        <Stack.Screen options={{ title: '學校活動' }} />
        <HeaderActions {...doneHeader(editor.close)} />
        <ListScreen>
          <Section footer="學校活動僅供查看，無法修改。">
            <Row title={event.title} titleLines={4} dotColor={event.category.color} subtitle={event.category.name} />
            <Row title="起始日期" detail={dateText(event.startDate)} />
            <Row title="結束日期" detail={dateText(event.endDate)} />
          </Section>
        </ListScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: editor.isNew ? '新增活動' : '編輯活動' }} />
      <HeaderActions {...formHeader(editor.close, editor.save, editor.canSave)} />
      <ListScreen>
        <Section>
          <TextFieldRow
            label="活動標題"
            value={editor.title}
            onChangeText={editor.setTitle}
            // A new event starts at its title, as in Calendar.
            autoFocus={editor.isNew}
          />
        </Section>

        <Section>
          <DateRow label="起始日期" value={editor.startDate} onChange={editor.changeStartDate} />
          <DateRow
            label="結束日期"
            value={editor.endDate}
            onChange={editor.setEndDate}
            minimumDate={editor.startDate}
          />
          {/* Only an imported event can end before it starts: moving the
              start moves the end along, and the end picker stops at the start. */}
          {editor.validDates ? null : <Notice tone="error" title="結束日期不能早於起始日期。" />}
        </Section>

        <Section>
          {editor.categories.length > 0 ? (
            <PickerRow
              label="活動類別"
              icon={icons.label}
              value={editor.categoryValue}
              options={editor.categories.map((category) => ({ label: category.name, value: category.name }))}
              onChange={editor.setCategoryName}
            />
          ) : (
            <TextBlock text="此類別已移除，請重新選擇。" secondary />
          )}
          <ButtonRow label="管理活動類別" icon={icons.folder} onPress={editor.manageCategories} />
        </Section>

        {event ? (
          <Section>
            <ButtonRow label="刪除活動" icon={icons.delete} role="destructive" onPress={editor.remove} />
          </Section>
        ) : null}
      </ListScreen>
    </>
  );
}
