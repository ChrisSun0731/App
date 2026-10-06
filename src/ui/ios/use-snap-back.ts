import { useState } from 'react';

/**
 * Keeps a SwiftUI control that owns its selection (Picker, DatePicker) showing
 * `value`, as the kit contract requires.
 *
 * PickerView.swift and DatePickerView.swift copy the selection prop into a
 * SwiftUI @State on appear and whenever the prop changes. A tap moves that
 * @State at once and reports it. If the parent does not adopt the choice (a
 * cancelled confirmation alert, a refused date), the prop never changes, so
 * nothing moves the control back.
 *
 * `choose` reports the choice and remembers it. When the render that follows
 * still has another `value`, `identity` changes; pass it to the `id()`
 * modifier, which gives the view a new SwiftUI identity, so SwiftUI rebuilds
 * its @State from `value` on appear. (A React `key` does not do this: Fabric
 * recycles SwiftUI virtual views, so the remounted view keeps the same native
 * object and the same SwiftUI identity.) A parent that adopts the choice later,
 * e.g. after an alert, changes the prop, which the native view applies itself.
 */
export function useSnapBack<T extends string>(value: T, onChange: (value: T) => void) {
  const [generation, setGeneration] = useState(0);
  const [chosen, setChosen] = useState<{ value: T } | null>(null);

  // Adjusting state while rendering (React's "store information from previous
  // renders" pattern): this render already holds the parent's response, so no
  // effect, and no extra commit showing the refused option, is needed.
  if (chosen !== null) {
    setChosen(null);
    if (chosen.value !== value) setGeneration(generation + 1);
  }

  function choose(next: T) {
    setChosen({ value: next });
    onChange(next);
  }

  return { identity: `snap-${generation}`, choose };
}
