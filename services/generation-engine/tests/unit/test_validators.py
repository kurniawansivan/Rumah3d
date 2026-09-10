from generation_engine.domain.models import LotEnvelope, Opening, Room, Wall
from generation_engine.engine.validators import (
    circulation_connected,
    kdb_ok,
    klb_ok,
    min_area_ok,
    no_overlap,
    room_program_fulfilled,
    within_envelope,
)

ENVELOPE = LotEnvelope(
    polygon=[(0, 0), (10, 0), (10, 10), (0, 10)],
    area_m2=100,
    max_footprint_m2=60,
    max_total_floor_area_m2=None,
)


def _room(
    id_: str, polygon: list[tuple[float, float]], area: float, type_: str = "ruang_tamu"
) -> Room:
    return Room(id=id_, type=type_, polygon=polygon, area_m2=area)


def test_within_envelope_true_when_inside() -> None:
    room = _room("r1", [(1, 1), (5, 1), (5, 5), (1, 5)], 16)
    assert within_envelope([room], ENVELOPE) is True


def test_within_envelope_false_when_outside() -> None:
    room = _room("r1", [(9, 9), (12, 9), (12, 12), (9, 12)], 9)
    assert within_envelope([room], ENVELOPE) is False


def test_no_overlap_true_for_disjoint_rooms() -> None:
    r1 = _room("r1", [(0, 0), (2, 0), (2, 2), (0, 2)], 4)
    r2 = _room("r2", [(3, 0), (5, 0), (5, 2), (3, 2)], 4)
    assert no_overlap([r1, r2]) is True


def test_no_overlap_false_for_overlapping_rooms() -> None:
    r1 = _room("r1", [(0, 0), (3, 0), (3, 3), (0, 3)], 9)
    r2 = _room("r2", [(1, 1), (4, 1), (4, 4), (1, 4)], 9)
    assert no_overlap([r1, r2]) is False


def test_kdb_ok_respects_limit() -> None:
    room = _room("r1", [(0, 0), (7, 0), (7, 8), (0, 8)], 56)
    assert kdb_ok([room], lot_area_m2=100, kdb_percent=60) is True
    assert kdb_ok([room], lot_area_m2=100, kdb_percent=50) is False


def test_klb_ok_sums_all_floors() -> None:
    r1 = _room("r1", [(0, 0), (5, 0), (5, 5), (0, 5)], 25)
    r2 = _room("r2", [(0, 0), (5, 0), (5, 5), (0, 5)], 25)
    assert klb_ok([r1, r2], lot_area_m2=100, klb_percent=60) is True
    assert klb_ok([r1, r2], lot_area_m2=100, klb_percent=40) is False


def test_min_area_ok() -> None:
    room = _room("r1", [(0, 0), (3, 0), (3, 3), (0, 3)], 9)
    assert min_area_ok(room, min_area_m2=9) is True
    assert min_area_ok(room, min_area_m2=9.5) is False


def test_circulation_connected_true_with_door() -> None:
    room = _room("r1", [(0, 0), (4, 0), (4, 4), (0, 4)], 16)
    wall = Wall(
        id="w1", polyline=[(0, 0), (4, 0)], thickness_m=0.15, is_exterior=True, height_m=3.5
    )
    opening = Opening(id="o1", type="door", wall_id="w1", offset_m=1, width_m=0.9, height_m=2.1)
    assert circulation_connected([room], [wall], [opening]) is True


def test_circulation_connected_false_without_door() -> None:
    room = _room("r1", [(0, 0), (4, 0), (4, 4), (0, 4)], 16)
    wall = Wall(
        id="w1", polyline=[(0, 0), (4, 0)], thickness_m=0.15, is_exterior=True, height_m=3.5
    )
    window = Opening(id="o1", type="window", wall_id="w1", offset_m=1, width_m=0.9, height_m=1.2)
    assert circulation_connected([room], [wall], [window]) is False


def test_room_program_fulfilled() -> None:
    rooms = [_room("r1", [(0, 0), (1, 0), (1, 1), (0, 1)], 1, "kamar_tidur") for _ in range(2)]
    assert room_program_fulfilled(rooms, [("kamar_tidur", 2)]) is True
    assert room_program_fulfilled(rooms, [("kamar_tidur", 3)]) is False
