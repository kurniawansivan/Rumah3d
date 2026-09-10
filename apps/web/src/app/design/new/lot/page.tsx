"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { lotStepSchema } from "@rumah3d/schemas";
import type { CompassDirection, LotPosition, LotStep } from "@rumah3d/schemas";

import { WizardStepIndicator } from "@/components/wizard/WizardStepIndicator";
import { useWizardStore } from "@/lib/wizard/store";

// TODO(shadcn/ui): this form is hand-written with plain semantic HTML +
// Tailwind utility classes instead of shadcn/ui's Form/Input/Select
// primitives. shadcn/ui components are normally added via its CLI, which
// copies component source into the repo — that can't run in this pass
// (no installs/scaffolding). Swap these plain elements for the real
// shadcn/ui components once `pnpm dlx shadcn@latest add ...` can run again.
//
// `useForm<LotStep>` is explicit rather than left to infer from
// `defaultValues` — with both `resolver` and a partial `defaultValues`
// given, TS's inference converges on defaultValues' narrower literal shape
// and silently drops fields the resolver actually requires (length_m,
// width_m). LotStep (z.infer<typeof lotStepSchema>) stays the one source
// of truth for the full field shape either way.

const FACING_OPTIONS: Array<{ value: CompassDirection; label: string }> = [
  { value: "utara", label: "Utara" },
  { value: "timur_laut", label: "Timur Laut" },
  { value: "timur", label: "Timur" },
  { value: "tenggara", label: "Tenggara" },
  { value: "selatan", label: "Selatan" },
  { value: "barat_daya", label: "Barat Daya" },
  { value: "barat", label: "Barat" },
  { value: "barat_laut", label: "Barat Laut" },
];

const POSITION_OPTIONS: Array<{ value: LotPosition; label: string }> = [
  { value: "tengah", label: "Tengah (diapit tetangga di kedua sisi)" },
  { value: "sudut", label: "Sudut (menghadap dua sisi jalan)" },
];

export default function LotStepPage() {
  const router = useRouter();
  const brief = useWizardStore((state) => state.brief);
  const setLot = useWizardStore((state) => state.setLot);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LotStep>({
    resolver: zodResolver(lotStepSchema),
    // Seeded from the store so revisiting this step via a "Ubah" link (or
    // browser back) shows what was already entered, not a blank form —
    // length_m/width_m still render blank on a genuinely fresh visit,
    // same as before.
    defaultValues: {
      lot: {
        length_m: brief.lot?.length_m,
        width_m: brief.lot?.width_m,
        facing: brief.lot?.facing ?? ("utara" as CompassDirection),
        position: brief.lot?.position ?? ("tengah" as LotPosition),
      },
    },
  });

  const onSubmit = (values: { lot: unknown }) => {
    // Re-validate through the schema so `lot` is the fully parsed shape
    // regardless of exactly what react-hook-form's resolver handed back.
    const parsed = lotStepSchema.parse(values);
    setLot(parsed.lot);
    router.push("/design/new/regulasi");
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <WizardStepIndicator current={1} />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Data Lahan
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Masukkan ukuran dan orientasi lahan Anda untuk memulai desain. Hasil desain ini adalah
          konsep skematik, bukan dokumen konstruksi.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="lot.width_m"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Lebar lahan (m)
            </label>
            <input
              id="lot.width_m"
              type="number"
              step="0.1"
              inputMode="decimal"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("lot.width_m", { valueAsNumber: true })}
            />
            {errors.lot?.width_m ? (
              <p className="text-xs text-red-600">{errors.lot.width_m.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="lot.length_m"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Panjang lahan (m)
            </label>
            <input
              id="lot.length_m"
              type="number"
              step="0.1"
              inputMode="decimal"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("lot.length_m", { valueAsNumber: true })}
            />
            {errors.lot?.length_m ? (
              <p className="text-xs text-red-600">{errors.lot.length_m.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lot.facing"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Arah hadap
          </label>
          <select
            id="lot.facing"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            {...register("lot.facing")}
          >
            {FACING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.lot?.facing ? (
            <p className="text-xs text-red-600">{errors.lot.facing.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lot.position"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Posisi lahan
          </label>
          <select
            id="lot.position"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            {...register("lot.position")}
          >
            {POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.lot?.position ? (
            <p className="text-xs text-red-600">{errors.lot.position.message}</p>
          ) : null}
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
