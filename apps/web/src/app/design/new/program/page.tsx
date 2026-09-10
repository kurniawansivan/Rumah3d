"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  buildRoomProgramFromStep3,
  deriveProgramRuangStepFromBrief,
  programRuangStepSchema,
} from "@rumah3d/schemas";
import type { ProgramRuangStep } from "@rumah3d/schemas";

import { WizardStepIndicator } from "@/components/wizard/WizardStepIndicator";
import { useWizardStore } from "@/lib/wizard/store";

// TODO(shadcn/ui): see the same note in ../lot/page.tsx.

const POSITION_OPTIONS = [
  { value: "depan", label: "Depan" },
  { value: "belakang", label: "Belakang" },
  { value: "samping", label: "Samping" },
  { value: "tidak_ada_preferensi", label: "Tidak ada preferensi" },
] as const;

const SCHEMA_DEFAULTS: ProgramRuangStep = programRuangStepSchema.parse({});

export default function ProgramRuangStepPage() {
  const router = useRouter();
  const brief = useWizardStore((state) => state.brief);
  const setProgramRuang = useWizardStore((state) => state.setProgramRuang);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProgramRuangStep>({
    resolver: zodResolver(programRuangStepSchema),
    // Seeded from the store (see the same note in ../lot/page.tsx) via
    // deriveProgramRuangStepFromBrief — the stored room_program/amenities
    // shape, reconstructed back into this step's 17 fields — falling back
    // to the schema's own defaults on a genuinely fresh visit.
    defaultValues:
      deriveProgramRuangStepFromBrief({
        floors: brief.floors,
        room_program: brief.room_program,
        amenities: brief.amenities,
      }) ?? SCHEMA_DEFAULTS,
  });

  const jumlahKamarTidur = watch("jumlah_kamar_tidur");
  const parkirTipe = watch("parkir_tipe");
  const sertakanKamarPembantu = watch("sertakan_kamar_pembantu");
  const sertakanKolamRenang = watch("sertakan_kolam_renang");

  // PRD: "disabled/forced false when jumlahKamarTidur === 1" — a single
  // bedroom can't have a distinct "utama" one to point at.
  const hanyaSatuKamarTidur = jumlahKamarTidur === 1;
  useEffect(() => {
    if (hanyaSatuKamarTidur) {
      setValue("sertakan_kamar_tidur_utama", false);
    }
  }, [hanyaSatuKamarTidur, setValue]);

  const onSubmit = (values: ProgramRuangStep) => {
    const parsed = programRuangStepSchema.parse(values);
    const { floors, room_program, amenities } = buildRoomProgramFromStep3(parsed);
    setProgramRuang(floors, room_program, amenities);
    router.push("/design/new/gaya");
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <WizardStepIndicator current={3} />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Program Ruang
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Kebutuhan ruang untuk rumah Anda. Ruang yang dimatikan (off) tidak akan dimasukkan ke
          denah.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Lantai & Kamar
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="jumlah_lantai" className="text-sm text-zinc-700 dark:text-zinc-300">
                Jumlah lantai
              </label>
              <input
                id="jumlah_lantai"
                type="number"
                min={1}
                max={3}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("jumlah_lantai", { valueAsNumber: true })}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lebih dari 1 lantai menambahkan tangga otomatis ke denah.
              </p>
              {errors.jumlah_lantai ? (
                <p className="text-xs text-red-600">{errors.jumlah_lantai.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="jumlah_kamar_mandi"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Jumlah kamar mandi
              </label>
              <input
                id="jumlah_kamar_mandi"
                type="number"
                min={1}
                max={6}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("jumlah_kamar_mandi", { valueAsNumber: true })}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tidak termasuk KM pembantu (diatur di bawah).
              </p>
              {errors.jumlah_kamar_mandi ? (
                <p className="text-xs text-red-600">{errors.jumlah_kamar_mandi.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="jumlah_kamar_tidur"
              className="text-sm text-zinc-700 dark:text-zinc-300"
            >
              Jumlah kamar tidur
            </label>
            <input
              id="jumlah_kamar_tidur"
              type="number"
              min={1}
              max={6}
              className="w-full max-w-[10rem] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("jumlah_kamar_tidur", { valueAsNumber: true })}
            />
            {errors.jumlah_kamar_tidur ? (
              <p className="text-xs text-red-600">{errors.jumlah_kamar_tidur.message}</p>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              disabled={hanyaSatuKamarTidur}
              className="mt-0.5"
              {...register("sertakan_kamar_tidur_utama")}
            />
            <span>
              Sertakan kamar tidur utama
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                Salah satu kamar tidur ditandai lebih luas, dengan kamar mandi dalam.
                {hanyaSatuKamarTidur
                  ? " Tidak tersedia jika kamar tidur hanya 1."
                  : null}
              </span>
            </span>
          </label>
          {errors.sertakan_kamar_tidur_utama ? (
            <p className="text-xs text-red-600">{errors.sertakan_kamar_tidur_utama.message}</p>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Parkir
          </legend>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="parkir_tipe" className="text-sm text-zinc-700 dark:text-zinc-300">
              Tipe parkir
            </label>
            <select
              id="parkir_tipe"
              className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("parkir_tipe")}
            >
              <option value="carport">Carport</option>
              <option value="garasi">Garasi</option>
              <option value="tidak_ada">Tidak ada</option>
            </select>
          </div>

          {parkirTipe !== "tidak_ada" ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="parkir_kapasitas_mobil"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Kapasitas mobil
              </label>
              <input
                id="parkir_kapasitas_mobil"
                type="number"
                min={1}
                max={4}
                className="w-full max-w-[10rem] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("parkir_kapasitas_mobil", { valueAsNumber: true })}
              />
              {errors.parkir_kapasitas_mobil ? (
                <p className="text-xs text-red-600">{errors.parkir_kapasitas_mobil.message}</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Ruang Umum
          </legend>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("ruang_tamu")} />
            Ruang tamu
          </label>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="konsep_ruang_makan_keluarga"
              className="text-sm text-zinc-700 dark:text-zinc-300"
            >
              Ruang makan & keluarga
            </label>
            <select
              id="konsep_ruang_makan_keluarga"
              className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("konsep_ruang_makan_keluarga")}
            >
              <option value="gabung">Gabung (open-plan)</option>
              <option value="terpisah">Terpisah</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dapur" className="text-sm text-zinc-700 dark:text-zinc-300">
              Dapur
            </label>
            <select
              id="dapur"
              className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              {...register("dapur")}
            >
              <option value="hanya_bersih">Hanya bersih (satu dapur serbaguna)</option>
              <option value="bersih_dan_kotor">Bersih dan kotor (terpisah)</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Kamar Pembantu & Servis
          </legend>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("sertakan_kamar_pembantu")} />
            Sertakan kamar pembantu
          </label>

          {sertakanKamarPembantu ? (
            <label className="ml-6 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" {...register("sertakan_km_pembantu")} />
              Sertakan KM pembantu
            </label>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("sertakan_area_servis")} />
            Sertakan area servis/jemuran
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Outdoor
          </legend>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("sertakan_kolam_renang")} />
            Sertakan kolam renang
          </label>

          {sertakanKolamRenang ? (
            <div className="ml-6 flex flex-col gap-1.5">
              <label
                htmlFor="posisi_kolam_renang"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Posisi kolam renang
              </label>
              <select
                id="posisi_kolam_renang"
                className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                {...register("posisi_kolam_renang")}
              >
                {POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("taman_depan")} />
            Taman depan
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("taman_belakang")} />
            Taman belakang
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Lainnya
          </legend>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" {...register("sertakan_mushola")} />
            Sertakan mushola kecil
          </label>
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
