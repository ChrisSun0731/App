import type { icons } from './icons';

type IconValue = (typeof icons)[keyof typeof icons];

export interface HeaderMenuAction {
  kind?: 'action';
  key: string;
  label: string;
  icon?: IconValue;
  onPress: () => void;
  destructive?: boolean;
  /** Shows a checkmark next to the action. */
  selected?: boolean;
}

/**
 * A nested menu inside a 'menu' item, e.g. 選擇班級 with one action per class.
 * iOS: a native submenu. Android: the open dropdown switches to its actions,
 * under a back item.
 */
export interface HeaderSubmenu {
  kind: 'submenu';
  key: string;
  label: string;
  icon?: IconValue;
  actions: HeaderMenuAction[];
}

export type HeaderMenuEntry = HeaderMenuAction | HeaderSubmenu;

export type HeaderItem =
  | {
      kind: 'icon';
      key: string;
      /** Accessibility label; also the tooltip on Android. */
      label: string;
      icon: IconValue;
      onPress: () => void;
      disabled?: boolean;
      /** The confirming action of a sheet (✓): filled with the tint on iOS. */
      prominent?: boolean;
    }
  | {
      kind: 'text';
      key: string;
      label: string;
      /** Spoken instead of `label`, e.g. 設定，目前班級 201 for a 201 button. */
      accessibilityLabel?: string;
      onPress: () => void;
      disabled?: boolean;
      /** The confirming action of a form: bold on iOS. */
      prominent?: boolean;
    }
  | {
      /** A segmented control, e.g. 日 / 週. */
      kind: 'segmented';
      key: string;
      /** Spoken name of the control. */
      label: string;
      options: readonly { label: string; value: string }[];
      value: string;
      onChange: (value: string) => void;
    }
  | {
      kind: 'menu';
      key: string;
      label: string;
      icon: IconValue;
      actions: HeaderMenuEntry[];
      disabled?: boolean;
    };

export interface HeaderActionsProps {
  left?: HeaderItem[];
  right?: HeaderItem[];
}
