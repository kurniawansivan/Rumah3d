from typing import Any, Literal

from pydantic import BaseModel, Field


class RoomOut(BaseModel):
    id: str
    type: str
    polygon: list[tuple[float, float]]
    area_m2: float


class WallOut(BaseModel):
    id: str
    polyline: list[tuple[float, float]]
    thickness_m: float
    is_exterior: bool
    height_m: float


class OpeningOut(BaseModel):
    id: str
    type: Literal["door", "window"]
    wall_id: str
    offset_m: float
    width_m: float
    height_m: float


class FloorOut(BaseModel):
    level: int
    height_m: float
    rooms: list[RoomOut]
    walls: list[WallOut]
    openings: list[OpeningOut]


class StairOut(BaseModel):
    id: str
    from_level: int
    to_level: int
    polygon: list[tuple[float, float]]


class RoofOut(BaseModel):
    type: Literal["pelana", "limasan", "datar"]
    pitch_deg: float


class TemplateRef(BaseModel):
    id: str
    code: str


class RuleRef(BaseModel):
    rule_id: str
    params: dict[str, Any] = Field(default_factory=dict)


class SolverInfo(BaseModel):
    status: Literal["optimal", "feasible", "infeasible", "stub"]
    solve_time_ms: int
    seed: int


class CandidateMetadata(BaseModel):
    engine_version: str
    engine_mode: Literal["stub", "solver"]
    why_selected: list[RuleRef]
    objective_breakdown: dict[str, float] = Field(default_factory=dict)
    warnings: list[RuleRef]
    solver: SolverInfo


class ValidationCheck(BaseModel):
    rule_id: str
    passed: bool
    params: dict[str, Any] = Field(default_factory=dict)


class ValidationReport(BaseModel):
    passed: bool
    checks: list[ValidationCheck]


class Candidate(BaseModel):
    version_id: str
    template: TemplateRef | None
    floors: list[FloorOut]
    stairs: list[StairOut] = Field(default_factory=list)
    roof: RoofOut | None
    metadata: CandidateMetadata
    validation: ValidationReport


class GenerationResponse(BaseModel):
    request_id: str
    status: Literal["success", "partial", "infeasible"]
    candidates: list[Candidate]
