from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from generation_engine.api.deps import get_db
from generation_engine.persistence.repositories import get_active_templates

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates(db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict[str, str]]:
    templates = await get_active_templates(db)
    return [{"id": str(t.id), "code": t.code, "name": t.name} for t in templates]
