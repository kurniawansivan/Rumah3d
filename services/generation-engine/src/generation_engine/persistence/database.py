from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from generation_engine.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(get_settings().engine_database_url, echo=False)


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=get_engine(), expire_on_commit=False)
