from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from generation_engine.domain.models import Room
from generation_engine.engine.stub_pipeline import generate_stub
from generation_engine.engine.validators import no_overlap

setback = st.floats(min_value=0, max_value=2, allow_nan=False)


@given(
    length_m=st.floats(min_value=10, max_value=40, allow_nan=False),
    width_m=st.floats(min_value=6, max_value=30, allow_nan=False),
    front_m=setback,
    back_m=setback,
    left_m=setback,
    right_m=setback,
)
@settings(max_examples=30)
def test_stub_pipeline_never_returns_invalid_geometry(
    length_m: float,
    width_m: float,
    front_m: float,
    back_m: float,
    left_m: float,
    right_m: float,
) -> None:
    result = generate_stub(
        length_m=length_m,
        width_m=width_m,
        front_m=front_m,
        back_m=back_m,
        left_m=left_m,
        right_m=right_m,
        kdb_percent=60,
        klb_percent=None,
    )
    assert result["status"] in {"success", "infeasible"}
    candidate = result["candidates"][0]
    if result["status"] == "success":
        assert candidate["validation"]["passed"] is True
        assert len(candidate["floors"][0]["rooms"]) == 1
    else:
        assert candidate["validation"]["passed"] is False
        assert candidate["floors"] == []


def test_stub_pipeline_is_deterministic() -> None:
    def run() -> dict[str, Any]:
        return generate_stub(
            length_m=15,
            width_m=10,
            front_m=3,
            back_m=2,
            left_m=1.5,
            right_m=1.5,
            kdb_percent=60,
            klb_percent=None,
        )

    first = run()
    second = run()
    assert first["candidates"][0]["floors"] == second["candidates"][0]["floors"]


def test_overlapping_rooms_are_rejected_by_validator() -> None:
    r1 = Room(id="a", type="x", polygon=[(0, 0), (3, 0), (3, 3), (0, 3)], area_m2=9)
    r2 = Room(id="b", type="x", polygon=[(1, 1), (4, 1), (4, 4), (1, 4)], area_m2=9)
    assert no_overlap([r1, r2]) is False
