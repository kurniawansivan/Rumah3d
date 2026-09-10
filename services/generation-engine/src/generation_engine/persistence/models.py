import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = {"schema": "engine"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    floors_min: Mapped[int] = mapped_column(SmallInteger)
    floors_max: Mapped[int] = mapped_column(SmallInteger)
    room_program_fit: Mapped[dict[str, Any]] = mapped_column(JSONB)
    zoning_graph: Mapped[dict[str, Any]] = mapped_column(JSONB)
    style_tags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    min_lot_length_m: Mapped[float] = mapped_column(Numeric(6, 2))
    min_lot_width_m: Mapped[float] = mapped_column(Numeric(6, 2))
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())


class RoomTypeNorm(Base):
    __tablename__ = "room_type_norms"
    __table_args__ = {"schema": "engine"}

    room_type: Mapped[str] = mapped_column(Text, primary_key=True)
    min_area_m2: Mapped[float] = mapped_column(Numeric(5, 2))
    max_area_m2: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    min_width_m: Mapped[float] = mapped_column(Numeric(4, 2))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DesignGenerationRequest(Base):
    __tablename__ = "design_generation_requests"
    __table_args__ = {"schema": "engine"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    requested_by: Mapped[str] = mapped_column(Text)
    input_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    engine_version: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class GeneratedDesignVersion(Base):
    __tablename__ = "generated_design_versions"
    __table_args__ = (UniqueConstraint("request_id", "version_number"), {"schema": "engine"})

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engine.design_generation_requests.id")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    version_number: Mapped[int] = mapped_column(Integer)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engine.templates.id"), nullable=True
    )
    geometry: Mapped[dict[str, Any]] = mapped_column(JSONB)
    rules_applied: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    objective_score: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    solver_status: Mapped[str] = mapped_column(Text)
    solve_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    validation_report: Mapped[dict[str, Any]] = mapped_column(JSONB)
    total_building_footprint_m2: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
