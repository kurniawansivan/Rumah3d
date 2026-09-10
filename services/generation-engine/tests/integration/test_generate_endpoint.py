from fastapi.testclient import TestClient

VALID_PAYLOAD = {
    "project_id": "11111111-1111-1111-1111-111111111111",
    "lot": {"length_m": 15, "width_m": 10, "facing": "utara"},
    "setbacks": {"front_m": 3, "back_m": 2, "left_m": 1.5, "right_m": 1.5},
    "kdb_percent": 60,
    "klb_percent": None,
    "floors": 1,
    "room_program": [{"type": "ruang_tamu", "count": 1, "priority": "required"}],
    "amenities": {},
    "style": "minimalis_modern",
    "num_candidates": 3,
}


def test_generate_endpoint_returns_stub_success(client: TestClient) -> None:
    response = client.post("/v1/designs/generate", json=VALID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"success", "infeasible"}
    assert body["candidates"][0]["metadata"]["engine_mode"] == "stub"


def test_generate_endpoint_infeasible_on_impossible_lot(client: TestClient) -> None:
    payload = {
        **VALID_PAYLOAD,
        "lot": {"length_m": 5, "width_m": 5, "facing": "utara"},
        "setbacks": {"front_m": 10, "back_m": 10, "left_m": 5, "right_m": 5},
        "room_program": [],
    }
    response = client.post("/v1/designs/generate", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "infeasible"


def test_generate_endpoint_rejects_malformed_request(client: TestClient) -> None:
    response = client.post("/v1/designs/generate", json={"lot": {"length_m": -1}})
    assert response.status_code == 422
