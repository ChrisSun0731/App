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
    }
  | {
      kind: 'text';
      key: string;
      label: string;
      onPress: () => void;
      disabled?: boolean;
      /** The confirming action of a form: bold on iOS. */
      prominent?: boolean;
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
