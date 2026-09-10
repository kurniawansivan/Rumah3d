from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from generation_engine.persistence.database import get_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session
