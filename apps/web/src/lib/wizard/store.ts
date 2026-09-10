import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Amenities, DesignBrief, Lot, RoomProgramItem, Setbacks } from "@rumah3d/schemas";

/**
 * Client-side wizard state. Holds whatever slice of the full `DesignBrief`
 * the user has filled in so far — `lot` (step 1),
 * `setbacks`/`kdb_percent`/`klb_percent` (step 2), and
 * `floors`/`room_program`/`amenities` (step 3) right now. Later steps (see
 * the `new-wizard-step` skill) add their own `setX` actions alongside
 * `setLot`/`setRegulasi`/`setProgramRuang` and their own slice of `brief`,
 * following the same pattern.
 *
 * Persisted to sessionStorage (not localStorage) so a design in progress
 * survives a refresh within the tab but doesn't linger across browser
 * sessions or leak between unrelated tabs/devices.
 */
export interface WizardState {
  brief: Partial<DesignBrief>;
  setLot: (lot: Lot) => void;
  setRegulasi: (setbacks: Setbacks | undefined, kdbPercent: number, klbPercent?: number) => void;
  setProgramRuang: (floors: number, roomProgram: RoomProgramItem[], amenities: Amenities) => void;
  reset: () => void;
}

const initialBrief: Partial<DesignBrief> = {};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      brief: initialBrief,
      setLot: (lot) =>
        set((state) => ({
          brief: { ...state.brief, lot },
        })),
      setRegulasi: (setbacks, kdbPercent, klbPercent) =>
        set((state) => ({
          brief: {
            ...state.brief,
            setbacks,
            kdb_percent: kdbPercent,
            klb_percent: klbPercent,
          },
        })),
      setProgramRuang: (floors, roomProgram, amenities) =>
        set((state) => ({
          brief: {
            ...state.brief,
            floors,
            room_program: roomProgram,
            amenities,
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
