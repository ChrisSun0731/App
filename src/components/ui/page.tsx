import { Button, Host, Switch, TextInput, useNativeState } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type KeyboardTypeOptions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND, usePalette } from '@/theme/palette';

export function Screen({ children, refreshing = false, onRefresh }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <View style={[styles.card, { backgroundColor: palette.surface }]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{children}</Text>;
}

export function Body({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) {
  const palette = usePalette();
  return <Text selectable style={[styles.body, { color: secondary ? palette.textSecondary : palette.text }]}>{children}</Text>;
}

export function ActionButton({ label, onPress, disabled = false, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; destructive?: boolean;
}) {
  return <Host matchContents style={{ alignSelf: 'flex-start' }} seedColor={destructive ? '#BA1A1A' : BRAND}>
    <Button label={label} onPress={onPress} disabled={disabled} variant={destructive ? 'outlined' : 'filled'} />
  </Host>;
}

export function Field({ label, value, onChangeText, multiline = false, keyboardType }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; keyboardType?: KeyboardTypeOptions;
}) {
  const palette = usePalette();
  const nativeValue = useNativeState(value);
  const nativeChanges = useRef<string[]>([]);
  useEffect(() => {
    const index = nativeChanges.current.lastIndexOf(value);
    if (index >= 0) {
      // React is acknowledging a native edit. The field may already contain
      // later keystrokes, so writing this older value back would erase them.
      nativeChanges.current.splice(0, index + 1);
    } else {
      nativeChanges.current = [];
      if (nativeValue.get() !== value) nativeValue.set(value);
    }
  }, [nativeValue, value]);
  function handleChange(text: string) {
    nativeChanges.current.push(text);
    onChangeText(text);
  }
  return <View style={{ gap: 6 }}>
    <Body secondary>{label}</Body>
    <Host matchContents={{ vertical: true }} seedColor={BRAND}>
      <TextInput value={nativeValue} onChangeText={handleChange} placeholder={label}
        multiline={multiline} numberOfLines={multiline ? 4 : 1} keyboardType={keyboardType}
        style={{ padding: 12, borderRadius: Platform.OS === 'ios' ? 10 : 4, borderWidth: 1, borderColor: palette.separator }} />
    </Host>
  </View>;
}

export function Segment({ options, selectedIndex, onChange }: {
  options: string[]; selectedIndex: number; onChange: (index: number) => void;
}) {
  const palette = usePalette();
  return <SegmentedControl values={options} selectedIndex={selectedIndex} appearance={palette.scheme}
    tintColor={Platform.OS === 'android' ? palette.tintContainer as string : BRAND}
    onChange={(event) => onChange(event.nativeEvent.selectedSegmentIndex)} />;
}

export function Toggle({ label, value, onChange, disabled = false }: {
  label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  return <Host matchContents={{ vertical: true }} seedColor={BRAND}>
    <Switch label={label} value={value} onValueChange={onChange} disabled={disabled} />
  </Host>;
}

const styles = StyleSheet.create({
  content: { padding: 16, flexGrow: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: 760, gap: 16 },
  card: { padding: 16, borderRadius: Platform.OS === 'ios' ? 14 : 20, gap: 12 },
  title: { fontSize: 21, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
});
