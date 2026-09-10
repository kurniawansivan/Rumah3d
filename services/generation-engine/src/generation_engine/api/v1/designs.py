from typing import Any

from fastapi import APIRouter, HTTPException

from generation_engine.api.schemas.generation_request import GenerationRequest
from generation_engine.api.schemas.generation_response import GenerationResponse
from generation_engine.engine.stub_pipeline import generate_stub

router = APIRouter(prefix="/designs", tags=["designs"])


@router.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest) -> dict[str, Any]:
    return generate_stub(
        length_m=request.lot.length_m,
        width_m=request.lot.width_m,
        front_m=request.setbacks.front_m,
        back_m=request.setbacks.back_m,
        left_m=request.setbacks.left_m,
        right_m=request.setbacks.right_m,
        kdb_percent=request.kdb_percent,
        klb_percent=request.klb_percent,
    )


@router.get("/{version_id}")
async def get_design(version_id: str) -> dict[str, str]:
    raise HTTPException(
        status_code=404,
        detail=f"No stored version {version_id} — persistence not wired up yet (engine is stub-mode only).",
    )
