"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { designBriefSchema } from "@rumah3d/schemas";

import { WizardStepIndicator } from "@/components/wizard/WizardStepIndicator";
import { useWizardStore } from "@/lib/wizard/store";
import {
  FACING_LABELS,
  LOT_POSITION_LABELS,
  POOL_POSITION_LABELS,
  PRIORITAS_LABELS,
  ROOM_TYPE_LABELS,
  STYLE_LABELS,
} from "@/lib/wizard/labels";

// TODO(shadcn/ui): see the same note in ../lot/page.tsx.

const DISCLAIMER =
  "Bukan dokumen konstruksi final — konsultasikan ke arsitek/insinyur berlisensi sebelum membangun.";

// Maps a designBriefSchema top-level field name (the first path segment
// of a failed safeParse's issue) to the step that collects it, so an
// incomplete brief can deep-link straight back to whichever step needs
// attention — docs/prd/floor-plan-wizard.md Step 5: "a deep link back to
// the specific wizard step... so the user's next action is obvious".
const FIELD_TO_STEP: Record<string, string> = {
  lot: "/design/new/lot",
  setbacks: "/design/new/regulasi",
  kdb_percent: "/design/new/regulasi",
  klb_percent: "/design/new/regulasi",
  floors: "/design/new/program",
  room_program: "/design/new/program",
  amenities: "/design/new/program",
  style: "/design/new/gaya",
  prioritas_saat_tidak_muat: "/design/new/gaya",
};

export default function ReviewStepPage() {
  const router = useRouter();
  const brief = useWizardStore((state) => state.brief);

  const validation = designBriefSchema.safeParse(brief);
  const firstMissingField = !validation.success
    ? String(validation.error.issues[0]?.path[0] ?? "")
    : null;
  const missingStepHref = firstMissingField
    ? (FIELD_TO_STEP[firstMissingField] ?? "/design/new/lot")
    : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <WizardStepIndicator current={5} />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Tinjau & Buat Denah
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Periksa kembali jawaban Anda. Klik &ldquo;Ubah&rdquo; pada bagian mana pun untuk
          mengoreksi tanpa kehilangan jawaban bagian lain.
        </p>
      </div>

      <SummarySection title="Data Lahan" editHref="/design/new/lot">
        {brief.lot ? (
          <>
            <SummaryRow label="Lebar">{brief.lot.width_m} m</SummaryRow>
            <SummaryRow label="Panjang">{brief.lot.length_m} m</SummaryRow>
            <SummaryRow label="Arah hadap">{FACING_LABELS[brief.lot.facing]}</SummaryRow>
            <SummaryRow label="Posisi lahan">{LOT_POSITION_LABELS[brief.lot.position]}</SummaryRow>
          </>
        ) : (
          <EmptyNotice />
        )}
      </SummarySection>

      <SummarySection title="Batasan Regulasi" editHref="/design/new/regulasi">
        <SummaryRow label="GSB depan">
          {brief.setbacks?.front_m !== undefined ? `${brief.setbacks.front_m} m` : "—"}
        </SummaryRow>
        <SummaryRow label="GSB samping">
          {brief.setbacks?.left_m !== undefined ? `${brief.setbacks.left_m} m` : "—"}
        </SummaryRow>
        <SummaryRow label="GSB belakang">
          {brief.setbacks?.back_m !== undefined ? `${brief.setbacks.back_m} m` : "—"}
        </SummaryRow>
        <SummaryRow label="KDB">{brief.kdb_percent ?? 60}%</SummaryRow>
        <SummaryRow label="KLB">
          {brief.klb_percent !== undefined ? `${brief.klb_percent}%` : "—"}
        </SummaryRow>
      </SummarySection>

      <SummarySection title="Program Ruang" editHref="/design/new/program">
        {brief.floors && brief.room_program && brief.amenities ? (
          <>
            <SummaryRow label="Jumlah lantai">{brief.floors}</SummaryRow>
            <SummaryRow label="Ruang">
              {brief.room_program.length > 0 ? (
                <ul className="list-disc pl-4">
                  {brief.room_program.map((item) => (
                    <li key={item.type}>
                      {ROOM_TYPE_LABELS[item.type]} × {item.count}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </SummaryRow>
            <SummaryRow label="Kolam renang">
              {brief.amenities.pool.included
                ? `Ya${
                    brief.amenities.pool.position_preference
                      ? ` (${POOL_POSITION_LABELS[brief.amenities.pool.position_preference]})`
                      : ""
                  }`
                : "Tidak"}
            </SummaryRow>
            <SummaryRow label="Kamar pembantu">
              {brief.amenities.kamar_pembantu.included
                ? `Ya${brief.amenities.kamar_pembantu.with_bathroom ? " (dengan KM)" : ""}`
                : "Tidak"}
            </SummaryRow>
          </>
        ) : (
          <EmptyNotice />
        )}
      </SummarySection>

      <SummarySection title="Gaya & Prioritas" editHref="/design/new/gaya">
        <SummaryRow label="Gaya arsitektur">
          {STYLE_LABELS[brief.style ?? "minimalis_modern"]}
        </SummaryRow>
        <SummaryRow label="Prioritas jika tidak muat">
          {PRIORITAS_LABELS[brief.prioritas_saat_tidak_muat ?? "kamar"]}
        </SummaryRow>
      </SummarySection>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {DISCLAIMER}
      </p>

      {missingStepHref ? (
        <p role="alert" className="text-sm text-red-600">
          Ada data yang belum lengkap.{" "}
          <Link href={missingStepHref} className="underline">
            Lengkapi di sini
          </Link>
          .
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => router.push("/design/new/preview")}
        disabled={!validation.success}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        Buat Denah
      </button>
    </main>
  );
}

function SummarySection({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</h2>
        <Link
          href={editHref}
          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Ubah
        </Link>
      </div>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
      <dt className="text-zinc-500 sm:w-40 sm:shrink-0 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

function EmptyNotice() {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum diisi.</p>;
}
