"""Repository abstractions for database-backed services."""

from apps.domain.repositories.entities import EntityRepository
from apps.domain.repositories.statements import StatementJobRepository

__all__ = [
    "EntityRepository",
    "StatementJobRepository",
]
