from collections import defaultdict

from shapely.geometry import LineString, Polygon

from generation_engine.domain.models import LotEnvelope, Opening, Room, Wall


def within_envelope(rooms: list[Room], envelope: LotEnvelope) -> bool:
    if not envelope.polygon:
        return False
    boundary = Polygon(envelope.polygon)
    return all(boundary.covers(Polygon(r.polygon)) for r in rooms)


def no_overlap(rooms: list[Room]) -> bool:
    polys = [Polygon(r.polygon) for r in rooms]
    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            if polys[i].intersection(polys[j]).area > 1e-6:
                return False
    return True


def kdb_ok(ground_floor_rooms: list[Room], lot_area_m2: float, kdb_percent: float | None) -> bool:
    if kdb_percent is None:
        return True
    footprint = sum(r.area_m2 for r in ground_floor_rooms)
    return footprint <= (kdb_percent / 100) * lot_area_m2 + 1e-6


def klb_ok(all_rooms: list[Room], lot_area_m2: float, klb_percent: float | None) -> bool:
    if klb_percent is None:
        return True
    total = sum(r.area_m2 for r in all_rooms)
    return total <= (klb_percent / 100) * lot_area_m2 + 1e-6


def min_area_ok(room: Room, min_area_m2: float) -> bool:
    return room.area_m2 >= min_area_m2 - 1e-6


def circulation_connected(rooms: list[Room], walls: list[Wall], openings: list[Opening]) -> bool:
    # Proxy for full pathfinding: walls don't yet record which room(s) they
    # border, so "connected" means each room touches a wall with a door,
    # not a verified multi-hop path. Revisit once postprocessing emits
    # explicit wall-to-room adjacency.
    if not rooms:
        return True
    door_wall_ids = {o.wall_id for o in openings if o.type == "door"}
    if not door_wall_ids:
        return False
    for room in rooms:
        boundary = Polygon(room.polygon).boundary
        if not any(
            boundary.distance(LineString(w.polyline)) < 1e-6 for w in walls if w.id in door_wall_ids
        ):
            return False
    return True


def room_program_fulfilled(rooms: list[Room], requested_program: list[tuple[str, int]]) -> bool:
    counts: dict[str, int] = defaultdict(int)
    for room in rooms:
        counts[room.type] += 1
    return all(counts.get(room_type, 0) >= count for room_type, count in requested_program)
