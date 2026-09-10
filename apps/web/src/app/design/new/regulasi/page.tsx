"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { regulasiStepSchema } from "@rumah3d/schemas";
import type { RegulasiStep, Setbacks } from "@rumah3d/schemas";

import { WizardStepIndicator } from "@/components/wizard/WizardStepIndicator";
import { useWizardStore } from "@/lib/wizard/store";

// TODO(shadcn/ui): see the same note in ../lot/page.tsx — plain HTML/
// Tailwind until shadcn/ui's CLI can run again.
//
// `useForm<RegulasiStep>` explicit for the same reason as the lot step:
// letting it infer from `defaultValues` alone silently narrows the type.

export default function RegulasiStepPage() {
  const router = useRouter();
  const brief = useWizardStore((state) => state.brief);
  const setRegulasi = useWizardStore((state) => state.setRegulasi);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegulasiStep>({
    resolver: zodResolver(regulasiStepSchema),
    // Seeded from the store (see the same note in ../lot/page.tsx) —
    // gsb_samping_m is read back from setbacks.left_m, the one side this
    // step's own submit always mirrors into both left_m and right_m.
    defaultValues: {
      gsb_depan_m: brief.setbacks?.front_m,
      gsb_samping_m: brief.setbacks?.left_m,
      gsb_belakang_m: brief.setbacks?.back_m,
      kdb_percent: brief.kdb_percent ?? 60,
      klb_percent: brief.klb_percent,
    },
  });

  const onSubmit = (values: RegulasiStep) => {
    const parsed = regulasiStepSchema.parse(values);
    const hasAnySetback =
      parsed.gsb_depan_m !== undefined ||
      parsed.gsb_samping_m !== undefined ||
      parsed.gsb_belakang_m !== undefined;

    // The wizard's single "GSB samping" input applies to both lot sides —
    // the stored/engine contract keeps left_m and right_m independent for
    // future corner-lot precision (docs/hld/generation-engine-contract.md),
    // so this is the one place that duplicates it into both.
    const setbacks: Setbacks | undefined = hasAnySetback
      ? {
          front_m: parsed.gsb_depan_m,
          back_m: parsed.gsb_belakang_m,
          left_m: parsed.gsb_samping_m,
          right_m: parsed.gsb_samping_m,
        }
      : undefined;

    setRegulasi(setbacks, parsed.kdb_percent, parsed.klb_percent);
    router.push("/design/new/program");
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <WizardStepIndicator current={2} />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Batasan Regulasi
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nilai default bersifat umum — gunakan angka dari izin/PBG wilayah Anda jika sudah tahu.
          Kosongkan GSB jika belum tahu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Garis sempadan bangunan (GSB) — opsional
          </legend>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Jarak minimum bangunan dari batas lahan, dalam meter.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gsb_depan_m" className="text-sm text-zinc-700 dark:text-zinc-300">
                Depan (m)
              </label>
              <input
                id="gsb_depan_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("gsb_depan_m", { valueAsNumber: true })}
              />
              {errors.gsb_depan_m ? (
                <p className="text-xs text-red-600">{errors.gsb_depan_m.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gsb_samping_m" className="text-sm text-zinc-700 dark:text-zinc-300">
                Samping (m)
              </label>
              <input
                id="gsb_samping_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("gsb_samping_m", { valueAsNumber: true })}
              />
              {errors.gsb_samping_m ? (
                <p className="text-xs text-red-600">{errors.gsb_samping_m.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gsb_belakang_m" className="text-sm text-zinc-700 dark:text-zinc-300">
                Belakang (m)
              </label>
              <input
                id="gsb_belakang_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("gsb_belakang_m", { valueAsNumber: true })}
              />
              {errors.gsb_belakang_m ? (
                <p className="text-xs text-red-600">{errors.gsb_belakang_m.message}</p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kdb_percent" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              KDB (%)
            </label>
            <input
              id="kdb_percent"
              type="number"
              step="1"
              inputMode="numeric"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("kdb_percent", { valueAsNumber: true })}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Persentase maksimum luas lahan yang boleh tertutup bangunan di lantai dasar.
            </p>
            {errors.kdb_percent ? (
              <p className="text-xs text-red-600">{errors.kdb_percent.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="klb_percent" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              KLB (%) — opsional
            </label>
            <input
              id="klb_percent"
              type="number"
              step="1"
              inputMode="numeric"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("klb_percent", { valueAsNumber: true })}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Persentase maksimum total luas lantai dari semua lantai. Kosongkan jika belum tahu.
            </p>
            {errors.klb_percent ? (
              <p className="text-xs text-red-600">{errors.klb_percent.message}</p>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Lanjutkan
        </button>
      </form>
    </main>
  );
}
