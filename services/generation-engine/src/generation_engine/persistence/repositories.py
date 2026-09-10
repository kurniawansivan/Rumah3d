import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from generation_engine.persistence.models import DesignGenerationRequest, GeneratedDesignVersion, Template


async def get_active_templates(session: AsyncSession) -> list[Template]:
    result = await session.execute(select(Template).where(Template.is_active.is_(True)))
    return list(result.scalars().all())


async def save_request(session: AsyncSession, request: DesignGenerationRequest) -> DesignGenerationRequest:
    session.add(request)
    await session.flush()
    return request


async def save_version(session: AsyncSession, version: GeneratedDesignVersion) -> GeneratedDesignVersion:
    session.add(version)
    await session.flush()
    return version


async def get_version(session: AsyncSession, version_id: uuid.UUID) -> GeneratedDesignVersion | None:
    return await session.get(GeneratedDesignVersion, version_id)
