import time
import uuid
from dataclasses import asdict
from typing import Any

from generation_engine.domain.enums import ResponseStatus, RoomType, SolverStatus
from generation_engine.domain.models import LotEnvelope, Opening, Room, Wall
from generation_engine.engine.envelope import compute_envelope
from generation_engine.engine.validators import (
    circulation_connected,
    kdb_ok,
    klb_ok,
    no_overlap,
    within_envelope,
)

ENGINE_VERSION = "0.1.0-stub"
FLOOR_HEIGHT_M = 3.5
MIN_ROOM_MARGIN_M = 0.5


def _build_stub_room(
    envelope: LotEnvelope,
) -> tuple[Room, list[Wall], list[Opening]] | None:
    if not envelope.polygon:
        return None
    xs = [p[0] for p in envelope.polygon]
    ys = [p[1] for p in envelope.polygon]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    width = x1 - x0
    depth = y1 - y0
    if width <= MIN_ROOM_MARGIN_M or depth <= MIN_ROOM_MARGIN_M:
        return None

    polygon = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    room = Room(
        id="r1", type=RoomType.RUANG_TAMU.value, polygon=polygon, area_m2=round(width * depth, 2)
    )

    walls = [
        Wall(
            id="w1",
            polyline=[(x0, y0), (x1, y0)],
            thickness_m=0.15,
            is_exterior=True,
            height_m=FLOOR_HEIGHT_M,
        ),
        Wall(
            id="w2",
            polyline=[(x1, y0), (x1, y1)],
            thickness_m=0.15,
            is_exterior=True,
            height_m=FLOOR_HEIGHT_M,
        ),
        Wall(
            id="w3",
            polyline=[(x1, y1), (x0, y1)],
            thickness_m=0.15,
            is_exterior=True,
            height_m=FLOOR_HEIGHT_M,
        ),
        Wall(
            id="w4",
            polyline=[(x0, y1), (x0, y0)],
            thickness_m=0.15,
            is_exterior=True,
            height_m=FLOOR_HEIGHT_M,
        ),
    ]
    openings = [
        Opening(
            id="o1",
            type="door",
            wall_id="w1",
            offset_m=min(1.2, width / 2),
            width_m=0.9,
            height_m=2.1,
        )
    ]

    return room, walls, openings


def generate_stub(
    *,
    length_m: float,
    width_m: float,
    front_m: float,
    back_m: float,
    left_m: float,
    right_m: float,
    kdb_percent: float | None,
    klb_percent: float | None,
) -> dict[str, Any]:
    start = time.monotonic()
    lot_area = length_m * width_m
    envelope = compute_envelope(
        length_m, width_m, front_m, back_m, left_m, right_m, kdb_percent, klb_percent
    )

    built = _build_stub_room(envelope)
    solve_time_ms = int((time.monotonic() - start) * 1000)

    if built is None:
        return _infeasible_response(solve_time_ms, reason="envelope_non_positive")

    room, walls, openings = built
    checks = {
        "within_envelope": within_envelope([room], envelope),
        "no_overlap": no_overlap([room]),
        "kdb_ok": kdb_ok([room], lot_area, kdb_percent),
        "klb_ok": klb_ok([room], lot_area, klb_percent),
        "circulation_connected": circulation_connected([room], walls, openings),
    }
    if not all(checks.values()):
        return _infeasible_response(
            solve_time_ms, reason="stub_room_failed_validation", checks=checks
        )

    return {
        "request_id": str(uuid.uuid4()),
        "status": ResponseStatus.SUCCESS.value,
        "candidates": [
            {
                "version_id": str(uuid.uuid4()),
                "template": None,
                "floors": [
                    {
                        "level": 0,
                        "height_m": FLOOR_HEIGHT_M,
                        "rooms": [asdict(room)],
                        "walls": [asdict(w) for w in walls],
                        "openings": [asdict(o) for o in openings],
                    }
                ],
                "stairs": [],
                "roof": {"type": "pelana", "pitch_deg": 30},
                "metadata": {
                    "engine_version": ENGINE_VERSION,
                    "engine_mode": "stub",
                    "why_selected": [{"rule_id": "stub_single_room", "params": {}}],
                    "objective_breakdown": {},
                    "warnings": [],
                    "solver": {
                        "status": SolverStatus.STUB.value,
                        "solve_time_ms": solve_time_ms,
                        "seed": 42,
                    },
                },
                "validation": {
                    "passed": True,
                    "checks": [
                        {"rule_id": k, "passed": v, "params": {}} for k, v in checks.items()
                    ],
                },
            }
        ],
    }


def _infeasible_response(
    solve_time_ms: int, *, reason: str, checks: dict[str, bool] | None = None
) -> dict[str, Any]:
    check_list = (
        [{"rule_id": k, "passed": v, "params": {}} for k, v in checks.items()]
        if checks
        else [{"rule_id": reason, "passed": False, "params": {}}]
    )
    return {
        "request_id": str(uuid.uuid4()),
        "status": ResponseStatus.INFEASIBLE.value,
        "candidates": [
            {
                "version_id": str(uuid.uuid4()),
                "template": None,
                "floors": [],
                "stairs": [],
                "roof": None,
                "metadata": {
                    "engine_version": ENGINE_VERSION,
                    "engine_mode": "stub",
                    "why_selected": [],
                    "objective_breakdown": {},
                    "warnings": [{"rule_id": reason, "params": {}}],
                    "solver": {
                        "status": SolverStatus.INFEASIBLE.value,
                        "solve_time_ms": solve_time_ms,
                        "seed": 42,
                    },
                },
                "validation": {"passed": False, "checks": check_list},
            }
        ],
    }
