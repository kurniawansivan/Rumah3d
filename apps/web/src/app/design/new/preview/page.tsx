"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";

import type { DesignBrief, GenerationResponse } from "@rumah3d/schemas";

import { PlanSvg } from "@/components/floor-plan/PlanSvg";
import { useWizardStore } from "@/lib/wizard/store";

interface GenerateErrorBody {
  error?: string;
}

async function generateDesign(brief: Partial<DesignBrief>): Promise<GenerationResponse> {
  const response = await fetch("/api/design/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as GenerateErrorBody | null;
    throw new Error(body?.error ?? `Permintaan gagal dengan status ${response.status}.`);
  }

  return (await response.json()) as GenerationResponse;
}

export default function PreviewPage() {
  const brief = useWizardStore((state) => state.brief);
  const hasRequestedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: generateDesign,
  });

  useEffect(() => {
    // Fire the generation request exactly once, against whatever the
    // wizard store holds at mount time — not a live query that should
    // re-run whenever `brief`'s reference identity happens to change.
    if (hasRequestedRef.current || !brief.lot) return;
    hasRequestedRef.current = true;
    mutation.mutate(brief);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!brief.lot) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Belum ada data lahan
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Silakan isi data lahan terlebih dahulu sebelum melihat pratinjau desain.
        </p>
        <Link
          href="/design/new/lot"
          className="inline-flex w-fit items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Isi Data Lahan
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Pratinjau Denah
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Hasil ini adalah desain konsep/skematik, bukan dokumen konstruksi (DED). Konsultasikan
          dengan arsitek/insinyur berlisensi sebelum membangun.
        </p>
      </div>

      {mutation.isPending || mutation.isIdle ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-16 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
        >
          Membuat denah...
        </div>
      ) : null}

      {mutation.isError ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p className="font-medium">Gagal membuat denah.</p>
          <p>{mutation.error instanceof Error ? mutation.error.message : "Terjadi kesalahan."}</p>
        </div>
      ) : null}

      {mutation.isSuccess && mutation.data ? <GenerationResult data={mutation.data} /> : null}
    </main>
  );
}

function GenerationResult({ data }: { data: GenerationResponse }) {
  if (data.status === "infeasible") {
    return (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        <p className="font-medium">Lahan atau kebutuhan ruang belum bisa dipenuhi.</p>
        <p>Coba ubah ukuran lahan, GSB, atau kebutuhan ruang, lalu buat ulang desain.</p>
      </div>
    );
  }

  const candidate = data.candidates[0];
  const floor = candidate?.floors[0];

  if (!candidate || !floor) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        Mesin generasi tidak mengembalikan denah untuk ditampilkan.
      </div>
    );
  }

  const isStub = candidate.metadata.engine_mode === "stub";

  return (
    <div className="flex flex-col gap-4">
      {isStub ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          Mode uji coba: mesin generasi saat ini mengembalikan satu ruangan contoh (hardcoded),
          bukan hasil perhitungan sesungguhnya.
        </p>
      ) : null}

      {candidate.metadata.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {candidate.metadata.warnings.map((warning, index) => (
            <li key={`${warning.rule_id}-${index}`}>{warning.rule_id}</li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <PlanSvg floor={floor} className="h-auto w-full" />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Desain ini adalah konsep skematik, bukan dokumen konstruksi (DED). Konsultasikan dengan
        arsitek/insinyur berlisensi sebelum membangun.
      </p>
    </div>
  );
}
