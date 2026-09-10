from dataclasses import dataclass, field


@dataclass(frozen=True)
class Room:
    id: str
    type: str
    polygon: list[tuple[float, float]]
    area_m2: float


@dataclass(frozen=True)
class Wall:
    id: str
    polyline: list[tuple[float, float]]
    thickness_m: float
    is_exterior: bool
    height_m: float


@dataclass(frozen=True)
class Opening:
    id: str
    type: str
    wall_id: str
    offset_m: float
    width_m: float
    height_m: float


@dataclass(frozen=True)
class Floor:
    level: int
    height_m: float
    rooms: list[Room] = field(default_factory=list)
    walls: list[Wall] = field(default_factory=list)
    openings: list[Opening] = field(default_factory=list)


@dataclass(frozen=True)
class LotEnvelope:
    polygon: list[tuple[float, float]]
    area_m2: float
    max_footprint_m2: float | None
    max_total_floor_area_m2: float | None
