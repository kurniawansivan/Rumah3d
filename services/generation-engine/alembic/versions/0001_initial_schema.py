"""initial engine schema

Revision ID: 0001
Revises:
Create Date: 2026-09-09

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS engine")

    op.create_table(
        "templates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.Text, nullable=False, unique=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("floors_min", sa.SmallInteger, nullable=False),
        sa.Column("floors_max", sa.SmallInteger, nullable=False),
        sa.Column("room_program_fit", postgresql.JSONB, nullable=False),
        sa.Column("zoning_graph", postgresql.JSONB, nullable=False),
        sa.Column("style_tags", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("min_lot_length_m", sa.Numeric(6, 2), nullable=False),
        sa.Column("min_lot_width_m", sa.Numeric(6, 2), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="engine",
    )

    op.create_table(
        "room_type_norms",
        sa.Column("room_type", sa.Text, primary_key=True),
        sa.Column("min_area_m2", sa.Numeric(5, 2), nullable=False),
        sa.Column("max_area_m2", sa.Numeric(5, 2), nullable=True),
        sa.Column("min_width_m", sa.Numeric(4, 2), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        schema="engine",
    )

    # Raw SQL + exception guard rather than
    # `postgresql.ENUM(...).create(op.get_bind())`: that call's `checkfirst`
    # existence check doesn't reliably scope to a non-default schema, which
    # made it try (and fail) to recreate this type on a second run.
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE engine.request_status AS ENUM
                ('pending', 'success', 'partial', 'infeasible', 'error');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    request_status = postgresql.ENUM(
        "pending",
        "success",
        "partial",
        "infeasible",
        "error",
        name="request_status",
        schema="engine",
        create_type=False,
    )

    op.create_table(
        "design_generation_requests",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by", sa.Text, nullable=False),
        sa.Column("input_snapshot", postgresql.JSONB, nullable=False),
        sa.Column("engine_version", sa.Text, nullable=False),
        sa.Column("status", request_status, nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="engine",
    )
    op.create_index(
        "design_generation_requests_project_id_idx",
        "design_generation_requests",
        ["project_id"],
        schema="engine",
    )

    op.create_table(
        "generated_design_versions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engine.design_generation_requests.id"),
            nullable=False,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer, nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engine.templates.id"),
            nullable=True,
        ),
        sa.Column("geometry", postgresql.JSONB, nullable=False),
        sa.Column("rules_applied", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("parameters", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("objective_score", sa.Numeric(8, 4), nullable=True),
        sa.Column("solver_status", sa.Text, nullable=False),
        sa.Column("solve_time_ms", sa.Integer, nullable=True),
        sa.Column("validation_report", postgresql.JSONB, nullable=False),
        sa.Column("total_building_footprint_m2", sa.Numeric(8, 2), nullable=True),
        sa.Column("is_selected", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("request_id", "version_number"),
        schema="engine",
    )
    op.create_index(
        "generated_design_versions_request_id_idx",
        "generated_design_versions",
        ["request_id"],
        schema="engine",
    )
    op.create_index(
        "generated_design_versions_project_id_idx",
        "generated_design_versions",
        ["project_id"],
        schema="engine",
    )


def downgrade() -> None:
    op.drop_table("generated_design_versions", schema="engine")
    op.drop_table("design_generation_requests", schema="engine")
    postgresql.ENUM(name="request_status", schema="engine").drop(op.get_bind())
    op.drop_table("room_type_norms", schema="engine")
    op.drop_table("templates", schema="engine")
    op.execute("DROP SCHEMA IF EXISTS engine CASCADE")
