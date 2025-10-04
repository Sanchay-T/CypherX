"""create_entity_management_tables

Revision ID: 1a5237500fd4
Revises: 
Create Date: 2025-09-30 16:40:07.460622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "1a5237500fd4"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create tables to persist custom entities and statement jobs."""

    # Ensure pgcrypto is available for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    bind = op.get_bind()
    inspector = inspect(bind)

    existing_tables = set(inspector.get_table_names())

    if "custom_entities" not in existing_tables:
        op.create_table(
            "custom_entities",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column(
                "aliases",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "match_count",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.PrimaryKeyConstraint("id", name="pk_custom_entities"),
        )
    else:
        columns = {column["name"] for column in inspector.get_columns("custom_entities")}
        if "match_count" not in columns:
            op.add_column(
                "custom_entities",
                sa.Column(
                    "match_count",
                    sa.Integer(),
                    nullable=False,
                    server_default=sa.text("0"),
                ),
            )

    op.create_index(
        "ix_custom_entities_name",
        "custom_entities",
        ["name"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_custom_entities_name_lower",
        "custom_entities",
        ["name"],
        postgresql_ops={"name": "text_pattern_ops"},
        if_not_exists=True,
    )

    if "statement_jobs" not in existing_tables:
        op.create_table(
            "statement_jobs",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("bank_name", sa.String(length=255), nullable=True),
            sa.Column(
                "status",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'queued'"),
            ),
            sa.Column("excel_path", sa.Text(), nullable=True),
            sa.Column("report_path", sa.Text(), nullable=True),
            sa.Column(
                "download_token",
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "payload",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "result",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
            ),
            sa.Column("error", sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint("id", name="pk_statement_jobs"),
        )

    op.create_index(
        "ix_statement_jobs_status",
        "statement_jobs",
        ["status"],
        if_not_exists=True,
    )

    if "entity_matches" not in existing_tables:
        op.create_table(
            "entity_matches",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "entity_id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
            ),
            sa.Column(
                "statement_job_id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
            ),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("source", sa.String(length=50), nullable=False),
            sa.ForeignKeyConstraint(
                ["entity_id"],
                ["custom_entities.id"],
                ondelete="CASCADE",
                name="fk_entity_matches_entity_id_custom_entities",
            ),
            sa.ForeignKeyConstraint(
                ["statement_job_id"],
                ["statement_jobs.id"],
                ondelete="CASCADE",
                name="fk_entity_matches_statement_job_id_statement_jobs",
            ),
            sa.PrimaryKeyConstraint("id", name="pk_entity_matches"),
        )

    op.create_index(
        "ix_entity_matches_entity_id",
        "entity_matches",
        ["entity_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_entity_matches_statement_job_id",
        "entity_matches",
        ["statement_job_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_entity_matches_entity_statement",
        "entity_matches",
        ["entity_id", "statement_job_id"],
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop entity management tables."""

    op.drop_index("ix_entity_matches_entity_statement", table_name="entity_matches")
    op.drop_index("ix_entity_matches_statement_job_id", table_name="entity_matches")
    op.drop_index("ix_entity_matches_entity_id", table_name="entity_matches")
    op.drop_table("entity_matches")

    op.drop_index("ix_statement_jobs_status", table_name="statement_jobs")
    op.drop_table("statement_jobs")

    op.drop_index("ix_custom_entities_name_lower", table_name="custom_entities")
    op.drop_index("ix_custom_entities_name", table_name="custom_entities")
    op.drop_table("custom_entities")
