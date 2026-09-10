from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class LotInput(BaseModel):
    length_m: float = Field(gt=0)
    width_m: float = Field(gt=0)
    facing: Literal[
        "utara",
        "timur_laut",
        "timur",
        "tenggara",
        "selatan",
        "barat_daya",
        "barat",
        "barat_laut",
    ]


class SetbacksInput(BaseModel):
    # Defaults match docs/prd/floor-plan-wizard.md Step 2 exactly — the
    # wizard's GSB fields are optional with these same generic fallbacks,
    # so a caller that omits a value (or the whole `setbacks` object) still
    # gets a sensible, documented buildable envelope rather than a 422.
    front_m: float = Field(default=3.0, ge=0)
    back_m: float = Field(default=2.0, ge=0)
    left_m: float = Field(default=1.5, ge=0)
    right_m: float = Field(default=1.5, ge=0)


class RoomProgramEntry(BaseModel):
    type: str
    count: int = Field(gt=0)
    priority: Literal["required", "flexible"] = "required"


class PoolAmenity(BaseModel):
    included: bool = False
    position_preference: Literal["depan", "belakang", "samping", "tidak_ada_preferensi"] | None = (
        None
    )


class KamarPembantuAmenity(BaseModel):
    included: bool = False
    with_bathroom: bool = False


class Amenities(BaseModel):
    pool: PoolAmenity = Field(default_factory=PoolAmenity)
    kamar_pembantu: KamarPembantuAmenity = Field(default_factory=KamarPembantuAmenity)


class GenerationRequest(BaseModel):
    project_id: str
    lot: LotInput
    setbacks: SetbacksInput = Field(default_factory=SetbacksInput)
    kdb_percent: float | None = Field(default=60, ge=1, le=100)
    klb_percent: float | None = Field(default=None, ge=1, le=100)
    floors: int = Field(ge=1, le=3)
    room_program: list[RoomProgramEntry] = Field(default_factory=list)
    amenities: Amenities = Field(default_factory=Amenities)
    style: Literal["minimalis_modern", "tropis", "klasik", "industrial"] = "minimalis_modern"
    num_candidates: int = Field(default=3, ge=1, le=3)

    @field_validator("klb_percent")
    @classmethod
    def klb_not_less_than_kdb(cls, v: float | None, info: Any) -> float | None:
        kdb = info.data.get("kdb_percent")
        if v is not None and kdb is not None and v < kdb:
            raise ValueError("klb_percent must be >= kdb_percent")
        return v
