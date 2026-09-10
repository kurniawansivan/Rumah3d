"use client";

import Link from "next/link";

import type { DesignBrief } from "@rumah3d/schemas";

import { useWizardStore } from "@/lib/wizard/store";

interface StepDef {
  step: number;
  label: string;
  href: string;
  isComplete: (brief: Partial<DesignBrief>) => boolean;
}

// A step counts as "complete" the moment its slice exists in the store at
// all — every setX action always writes every field in its slice, so
// presence (not truthiness) is what distinguishes "submitted, even with
// defaults accepted" from "never visited" for the fully-defaultable steps
// (regulasi, gaya). See docs/prd/floor-plan-wizard.md's wizard mechanics:
// "lets a user jump back to any already-completed step".
const STEPS: StepDef[] = [
  { step: 1, label: "Data Lahan", href: "/design/new/lot", isComplete: (b) => b.lot !== undefined },
  {
    step: 2,
    label: "Batasan Regulasi",
    href: "/design/new/regulasi",
    isComplete: (b) => b.kdb_percent !== undefined,
  },
  {
    step: 3,
    label: "Program Ruang",
    href: "/design/new/program",
    isComplete: (b) => b.floors !== undefined,
  },
  {
    step: 4,
    label: "Gaya & Prioritas",
    href: "/design/new/gaya",
    isComplete: (b) => b.style !== undefined,
  },
  { step: 5, label: "Tinjau & Buat Denah", href: "/design/new/review", isComplete: () => false },
];

export function WizardStepIndicator({ current }: { current: number }) {
  const brief = useWizardStore((state) => state.brief);
  const currentLabel = STEPS.find((step) => step.step === current)?.label ?? "";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Langkah {current} dari {STEPS.length} — {currentLabel}
      </p>
      <nav aria-label="Langkah wizard" className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {STEPS.map((step, index) => {
          const isCurrent = step.step === current;
          const isClickable = !isCurrent && step.isComplete(brief);
          return (
            <span key={step.step} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden className="text-[10px] text-zinc-300 dark:text-zinc-700">
                  /
                </span>
              ) : null}
              {isClickable ? (
                <Link
                  href={step.href}
                  className="text-[10px] text-zinc-500 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {step.step}
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={
                    isCurrent
                      ? "text-[10px] font-semibold text-zinc-900 dark:text-zinc-100"
                      : "text-[10px] text-zinc-300 dark:text-zinc-700"
                  }
                >
                  {step.step}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
