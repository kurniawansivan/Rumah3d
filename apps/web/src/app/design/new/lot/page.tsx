"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { lotStepSchema } from "@rumah3d/schemas";
import type { CompassDirection, LotPosition } from "@rumah3d/schemas";

import { useWizardStore } from "@/lib/wizard/store";

// TODO(shadcn/ui): this form is hand-written with plain semantic HTML +
// Tailwind utility classes instead of shadcn/ui's Form/Input/Select
// primitives. shadcn/ui components are normally added via its CLI, which
// copies component source into the repo — that can't run in this pass
// (no installs/scaffolding). Swap these plain elements for the real
// shadcn/ui components once `pnpm dlx shadcn@latest add ...` can run again.
//
// The form's field-values type is deliberately NOT hand-written here:
// `useForm` infers it straight from `zodResolver(lotStepSchema)` (and the
// `defaultValues` shape below), so there's exactly one source of truth for
// what this form's data looks like — the schema itself.

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
  const setLot = useWizardStore((state) => state.setLot);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(lotStepSchema),
    // Only fields with a genuine default are listed — `defaultValues` is a
    // deep-partial, so `length_m`/`width_m`/the setback fields are simply
    // omitted and render as blank, uncontrolled inputs until the user (or
    // this page's error state) fills them in.
    defaultValues: {
      lot: {
        facing: "utara" as CompassDirection,
        position: "tengah" as LotPosition,
      },
    },
  });

  const onSubmit = (values: { lot: unknown; setbacks?: unknown }) => {
    // Re-validate through the schema so `lot`/`setbacks` are the fully
    // parsed shape (setbacks coerced/cleaned) regardless of exactly what
    // react-hook-form's resolver handed back.
    const parsed = lotStepSchema.parse(values);
    setLot(parsed.lot, parsed.setbacks);
    router.push("/design/new/preview");
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
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

        <fieldset className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Garis sempadan bangunan (GSB) — opsional
          </legend>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Jarak minimum bangunan dari batas lahan, dalam meter. Kosongkan jika belum tahu.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="setbacks.front_m"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Depan (m)
              </label>
              <input
                id="setbacks.front_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("setbacks.front_m", { valueAsNumber: true })}
              />
              {errors.setbacks?.front_m ? (
                <p className="text-xs text-red-600">{errors.setbacks.front_m.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="setbacks.back_m" className="text-sm text-zinc-700 dark:text-zinc-300">
                Belakang (m)
              </label>
              <input
                id="setbacks.back_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("setbacks.back_m", { valueAsNumber: true })}
              />
              {errors.setbacks?.back_m ? (
                <p className="text-xs text-red-600">{errors.setbacks.back_m.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="setbacks.left_m" className="text-sm text-zinc-700 dark:text-zinc-300">
                Kiri (m)
              </label>
              <input
                id="setbacks.left_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("setbacks.left_m", { valueAsNumber: true })}
              />
              {errors.setbacks?.left_m ? (
                <p className="text-xs text-red-600">{errors.setbacks.left_m.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="setbacks.right_m"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Kanan (m)
              </label>
              <input
                id="setbacks.right_m"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("setbacks.right_m", { valueAsNumber: true })}
              />
              {errors.setbacks?.right_m ? (
                <p className="text-xs text-red-600">{errors.setbacks.right_m.message}</p>
              ) : null}
            </div>
          </div>
        </fieldset>

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
