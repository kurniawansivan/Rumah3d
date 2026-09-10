import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Rumah3d
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Ubah ukuran lahan dan kebutuhan ruang Anda menjadi denah 2D dan visualisasi 3D
          skematik — titik awal untuk berdiskusi dengan arsitek berlisensi, bukan dokumen
          konstruksi.
        </p>
      </div>

      <Link
        href="/design/new/lot"
        className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Mulai Desain
      </Link>

      <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
        Bukan dokumen konstruksi final — konsultasikan dengan arsitek/insinyur berlisensi
        sebelum membangun.
      </p>
    </main>
  );
}
