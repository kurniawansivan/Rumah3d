from generation_engine.engine.envelope import compute_envelope


def test_envelope_inset_from_setbacks() -> None:
    envelope = compute_envelope(
        length_m=15,
        width_m=10,
        front_m=3,
        back_m=2,
        left_m=1.5,
        right_m=1.5,
        kdb_percent=60,
        klb_percent=None,
    )
    assert envelope.area_m2 > 0
    assert envelope.max_footprint_m2 == 0.6 * (15 * 10)


def test_envelope_non_positive_when_setbacks_exceed_lot() -> None:
    envelope = compute_envelope(
        length_m=5,
        width_m=5,
        front_m=10,
        back_m=10,
        left_m=1,
        right_m=1,
        kdb_percent=None,
        klb_percent=None,
    )
    assert envelope.polygon == []
    assert envelope.area_m2 == 0.0
