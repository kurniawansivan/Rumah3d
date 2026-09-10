from enum import StrEnum


class RoomType(StrEnum):
    """Kept 1:1 with packages/schemas/src/design-brief.ts's roomTypeSchema
    — both are "the canonical list" per root CLAUDE.md §4. Pool is
    deliberately absent: it's an amenity (Amenities.pool), never a
    room_program entry, on both sides of the contract.
    """

    KAMAR_TIDUR_UTAMA = "kamar_tidur_utama"
    KAMAR_TIDUR = "kamar_tidur"
    KAMAR_MANDI = "kamar_mandi"
    DAPUR = "dapur"
    DAPUR_BERSIH = "dapur_bersih"
    DAPUR_KOTOR = "dapur_kotor"
    RUANG_TAMU = "ruang_tamu"
    RUANG_MAKAN = "ruang_makan"
    RUANG_KELUARGA = "ruang_keluarga"
    RUANG_MAKAN_KELUARGA = "ruang_makan_keluarga"
    CARPORT = "carport"
    GARASI = "garasi"
    AREA_SERVIS = "area_servis"
    KAMAR_PEMBANTU = "kamar_pembantu"
    TAMAN_DEPAN = "taman_depan"
    TAMAN_BELAKANG = "taman_belakang"
    MUSHOLA = "mushola"


class Style(StrEnum):
    MINIMALIS_MODERN = "minimalis_modern"
    TROPIS = "tropis"
    KLASIK = "klasik"
    INDUSTRIAL = "industrial"


class SolverStatus(StrEnum):
    OPTIMAL = "optimal"
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    STUB = "stub"


class Priority(StrEnum):
    REQUIRED = "required"
    FLEXIBLE = "flexible"


class ResponseStatus(StrEnum):
    SUCCESS = "success"
    PARTIAL = "partial"
    INFEASIBLE = "infeasible"
