from shapely.geometry import Polygon

from generation_engine.domain.models import LotEnvelope


def compute_envelope(
    length_m: float,
    width_m: float,
    front_m: float,
    back_m: float,
    left_m: float,
    right_m: float,
    kdb_percent: float | None,
    klb_percent: float | None,
) -> LotEnvelope:
    lot_area = length_m * width_m

    inset_width = width_m - left_m - right_m
    inset_length = length_m - front_m - back_m

    if inset_width <= 0 or inset_length <= 0:
        polygon: list[tuple[float, float]] = []
        area = 0.0
    else:
        shape = Polygon(
            [
                (left_m, front_m),
                (left_m + inset_width, front_m),
                (left_m + inset_width, front_m + inset_length),
                (left_m, front_m + inset_length),
            ]
        )
        polygon = [(x, y) for x, y, *_ in shape.exterior.coords[:-1]]
        area = shape.area

    max_footprint = (kdb_percent / 100) * lot_area if kdb_percent is not None else None
    max_total = (klb_percent / 100) * lot_area if klb_percent is not None else None

    return LotEnvelope(
        polygon=polygon,
        area_m2=area,
        max_footprint_m2=max_footprint,
        max_total_floor_area_m2=max_total,
    )
