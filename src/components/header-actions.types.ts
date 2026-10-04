import type { icons } from './icons';

type IconValue = (typeof icons)[keyof typeof icons];

export interface HeaderMenuAction {
  key: string;
  label: string;
  icon?: IconValue;
  onPress: () => void;
  destructive?: boolean;
  /** Shows a checkmark next to the action. */
  selected?: boolean;
}

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
      actions: HeaderMenuAction[];
    };

export interface HeaderActionsProps {
  left?: HeaderItem[];
  right?: HeaderItem[];
}
