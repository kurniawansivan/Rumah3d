"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { gayaStepSchema } from "@rumah3d/schemas";
import type { GayaStep } from "@rumah3d/schemas";

import { WizardStepIndicator } from "@/components/wizard/WizardStepIndicator";
import { useWizardStore } from "@/lib/wizard/store";

// TODO(shadcn/ui): see the same note in ../lot/page.tsx.

const STYLE_OPTIONS = [
  { value: "minimalis_modern", label: "Minimalis Modern" },
  { value: "tropis", label: "Tropis" },
  { value: "klasik", label: "Klasik" },
  { value: "industrial", label: "Industrial" },
] as const;

const PRIORITAS_OPTIONS = [
  { value: "kamar", label: "Kamar (jumlah/ukuran kamar)" },
  { value: "ruang_komunal", label: "Ruang komunal (ruang tamu/makan/keluarga)" },
] as const;

export default function GayaStepPage() {
  const router = useRouter();
  const brief = useWizardStore((state) => state.brief);
  const setGaya = useWizardStore((state) => state.setGaya);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<GayaStep>({
    resolver: zodResolver(gayaStepSchema),
    // Seeded from the store (see the same note in ../lot/page.tsx).
    defaultValues: {
      style: brief.style ?? "minimalis_modern",
      prioritas_saat_tidak_muat: brief.prioritas_saat_tidak_muat ?? "kamar",
    },
  });

  const onSubmit = (values: GayaStep) => {
    const parsed = gayaStepSchema.parse(values);
    setGaya(parsed.style, parsed.prioritas_saat_tidak_muat);
    router.push("/design/new/review");
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <WizardStepIndicator current={4} />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Gaya & Prioritas
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="style" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Gaya arsitektur
          </label>
          <select
            id="style"
            className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            {...register("style")}
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Memengaruhi tampilan fasad, atap, dan render 3D. Tidak mengubah tata letak ruang.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prioritas_saat_tidak_muat"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Prioritas jika lahan tidak cukup
          </label>
          <select
            id="prioritas_saat_tidak_muat"
            className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            {...register("prioritas_saat_tidak_muat")}
          >
            {PRIORITAS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Jika seluruh program ruang tidak muat di lahan, mana yang lebih penting
            dipertahankan?
          </p>
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
