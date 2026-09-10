import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { DesignBrief, Lot, Setbacks } from "@rumah3d/schemas";

/**
 * Client-side wizard state. Holds whatever slice of the full `DesignBrief`
 * the user has filled in so far — only `lot`/`setbacks` right now, since
 * only wizard step 1 exists. Later steps (see the `new-wizard-step` skill)
 * add their own `setX` actions alongside `setLot` and their own slice of
 * `brief`, following the same pattern.
 *
 * Persisted to sessionStorage (not localStorage) so a design in progress
 * survives a refresh within the tab but doesn't linger across browser
 * sessions or leak between unrelated tabs/devices.
 */
export interface WizardState {
  brief: Partial<DesignBrief>;
  setLot: (lot: Lot, setbacks?: Setbacks) => void;
  reset: () => void;
}

const initialBrief: Partial<DesignBrief> = {};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      brief: initialBrief,
      setLot: (lot, setbacks) =>
        set((state) => ({
          brief: {
            ...state.brief,
            lot,
            setbacks,
          },
        })),
      reset: () => set({ brief: initialBrief }),
    }),
    {
      name: "rumah3d-wizard",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
