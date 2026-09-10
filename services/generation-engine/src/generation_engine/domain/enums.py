from enum import StrEnum


class RoomType(StrEnum):
    KAMAR_TIDUR_UTAMA = "kamar_tidur_utama"
    KAMAR_TIDUR = "kamar_tidur"
    KAMAR_MANDI = "kamar_mandi"
    DAPUR = "dapur"
    RUANG_TAMU = "ruang_tamu"
    RUANG_MAKAN = "ruang_makan"
    RUANG_KELUARGA = "ruang_keluarga"
    CARPORT = "carport"
    GARASI = "garasi"
    AREA_SERVIS = "area_servis"
    KAMAR_PEMBANTU = "kamar_pembantu"
    MUSHOLA = "mushola"
    KOLAM_RENANG = "kolam_renang"


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
