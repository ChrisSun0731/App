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
  /** Greyed and not selectable, for an action with nothing to do right now. */
  disabled?: boolean;
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
      /**
       * The action it starts is running (e.g. 重新整理): disabled, and on iOS
       * drawn as a spinner in its place. SwiftUI's List cannot show refresh
       * progress started from code without moving its rows, so this is iOS's
       * counterpart of ListScreen.refreshing; Android greys the icon, as the
       * list's pull indicator already shows the progress.
       */
      busy?: boolean;
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
