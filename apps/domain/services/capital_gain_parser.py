"""Utilities to convert capital gain PDF statements into structured tables."""

from __future__ import annotations

from dataclasses import dataclass, field
import re
import csv
from pathlib import Path
from typing import Iterable, Sequence

import pandas as pd
import pdfplumber


@dataclass(frozen=True)
class _Word:
    """Lightweight representation of a token extracted from the PDF."""

    text: str
    x0: float
    x1: float
    top: float
    bottom: float
    page_index: int

    @property
    def center(self) -> float:
        return (self.x0 + self.x1) / 2


@dataclass(frozen=True)
class ExtractedCell:
    """Keeps track of every value pulled from the PDF for later verification."""

    section: str | None
    column: str
    value_text: str
    words: tuple[_Word, ...]


@dataclass
class CapitalGainStatement:
    """Structured representation of a capital gain PDF statement."""

    header: dict[str, str]
    summary_table: pd.DataFrame
    sections: dict[str, pd.DataFrame]
    cells: list[ExtractedCell] = field(default_factory=list)

    def to_csv(self, output_dir: Path, stem: str) -> None:
        """Persist the parsed tables to CSV."""

        output_dir.mkdir(parents=True, exist_ok=True)
        summary_path = output_dir / f"{stem}_summary.csv"
        self.summary_table.to_csv(summary_path, index=False)

        for section_name, df in self.sections.items():
            clean_section = section_name.lower().replace(" ", "_").replace("/", "_").replace(":", "")
            section_path = output_dir / f"{stem}_{clean_section}.csv"
            df.to_csv(section_path, index=False)

    def to_combined_csv(self, output_path: Path) -> None:
        """
        Write a single CSV that mirrors the PDF layout:
        summary table first, followed by Section A/B/C tables with their headers
        and total rows preserved.
        """

        raw_rows: list[list[str]] = []

        def add_blank_row() -> None:
            raw_rows.append([""])

        # Summary header/title
        raw_rows.append(["Capital Gain / Loss – Scheme level"])
        raw_rows.extend(_table_to_rows(self.summary_table))
        add_blank_row()

        for section_name in sorted(self.sections.keys()):
            raw_rows.append([section_name])
            raw_rows.extend(_table_to_rows(self.sections[section_name]))
            add_blank_row()

        width = max(len(row) for row in raw_rows)

        with output_path.open("w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            for row in raw_rows:
                padded = row + [""] * (width - len(row))
                writer.writerow(padded)

    def cross_check_against_pdf(self, pdf_path: Path) -> list[str]:
        """
        Re-open the PDF and ensure every captured token still appears at the
        expected coordinates. Returns issues (empty list means success).
        """

        issues: list[str] = []
        with pdfplumber.open(pdf_path) as pdf_reader:
            pdf_words = [
                _word_from_pdf(word, page_index=page_index)
                for page_index, page in enumerate(pdf_reader.pages)
                for word in page.extract_words(x_tolerance=1, y_tolerance=1)
            ]

        for cell in self.cells:
            for token in cell.words:
                matches = [
                    word
                    for word in pdf_words
                    if word.text == token.text
                    and abs(word.center - token.center) <= 2.5
                    and abs(word.top - token.top) <= 1.5
                ]
                if not matches:
                    issues.append(
                        f"{cell.section or 'Summary'} -> {cell.column}: "
                        f"token '{token.text}' not found near expected position."
                    )
                    break

        return issues


def parse_capital_gain_statement(pdf_path: Path) -> CapitalGainStatement:
    """Parse the provided PDF into structured tables."""

    summary_frames: list[pd.DataFrame] = []
    section_tables: dict[str, pd.DataFrame] = {}
    all_cells: list[ExtractedCell] = []
    header: dict[str, str] | None = None

    with pdfplumber.open(pdf_path) as pdf_reader:
        if not pdf_reader.pages:
            raise ValueError(f"No pages found in PDF: {pdf_path}")

        multi_page = len(pdf_reader.pages) > 1

        for page_index, page in enumerate(pdf_reader.pages):
            raw_words = page.extract_words(x_tolerance=1, y_tolerance=1)
            words = [_word_from_pdf(word, page_index=page_index) for word in raw_words]
            page_text = page.extract_text() or ""

            if header is None and page_index == 0:
                header = _extract_header(words, page_text)

            if page_index == 0:
                try:
                    summary_df, summary_cells = _parse_summary_table(words)
                    if multi_page:
                        summary_df = summary_df.copy()
                        summary_df.insert(0, "Page", str(page_index + 1))
                    summary_frames.append(summary_df)
                    all_cells.extend(summary_cells)
                except ValueError:
                    pass

            page_sections, section_cells = _parse_detail_sections(words)

            for section_name, df in page_sections.items():
                section_df = df.copy()
                if multi_page:
                    section_df.insert(0, "Page", str(page_index + 1))
                if section_name in section_tables:
                    section_tables[section_name] = pd.concat(
                        [section_tables[section_name], section_df], ignore_index=True
                    )
                else:
                    section_tables[section_name] = section_df

            all_cells.extend(section_cells)

    if header is None:
        header = {}

    summary_table = pd.concat(summary_frames, ignore_index=True) if summary_frames else pd.DataFrame()

    return CapitalGainStatement(
        header=header,
        summary_table=summary_table,
        sections=section_tables,
        cells=all_cells,
    )


# ---------------------------------------------------------------------------
# Header helpers
# ---------------------------------------------------------------------------


def _extract_header(words: Sequence[_Word], page_text: str) -> dict[str, str]:
    """Extract header metadata (PAN, name, address, etc.) from the top of the PDF."""

    header: dict[str, str] = {
        "statement_period": "",
        "status": "",
        "pan": "",
        "folio": "",
        "name": "",
        "mobile": "",
        "address": [],
    }

    for line in page_text.splitlines():
        if "For the period" in line:
            header["statement_period"] = line.strip()
            break

    status_tokens = [word.text for word in words if 55 <= word.top <= 70]
    if status_tokens:
        status_line = _normalize_spaced_tokens(status_tokens)
        status_line = status_line.replace("Status :", "").strip()
        if "PAN" in status_line:
            status_line = status_line.split("PAN", 1)[0].strip()
        header["status"] = status_line

    pan_word = _first_match(words, lambda w: len(w.text) == 10 and w.text.isalnum() and w.top < 120)
    if pan_word:
        header["pan"] = pan_word.text

    folio_word = _first_match(words, lambda w: w.text.isdigit() and len(w.text) >= 8 and w.top < 120)
    if folio_word:
        header["folio"] = folio_word.text

    name_tokens = [w.text for w in words if 85 <= w.top <= 100]
    if name_tokens:
        header["name"] = (
            _normalize_spaced_tokens(name_tokens).replace("Name :", "").replace("Name", "").strip()
        )

    mobile_word = _first_match(
        words, lambda w: w.text.isdigit() and len(w.text) == 10 and 150 <= w.top <= 170
    )
    if mobile_word:
        header["mobile"] = mobile_word.text

    address_tops = sorted(
        {
            round(word.top, 1)
            for word in words
            if 100 <= word.top <= 160 and ":" not in word.text and word.text.isprintable()
        }
    )
    address_lines: list[str] = []
    for top in address_tops:
        line_tokens = [
            word.text
            for word in sorted(words, key=lambda w: w.x0)
            if abs(word.top - top) <= 1.0 and ":" not in word.text
        ]
        line = " ".join(line_tokens).strip()
        if line and not line.startswith("Name"):
            address_lines.append(line)
    header["address"] = address_lines

    return header


# ---------------------------------------------------------------------------
# Summary table parsing
# ---------------------------------------------------------------------------


def _parse_summary_table(words: Sequence[_Word]) -> tuple[pd.DataFrame, list[ExtractedCell]]:
    header_words = [w for w in words if 228 <= w.top <= 245]
    data_row_words = [w for w in words if 248 <= w.top <= 265]
    total_row_words = [w for w in words if 266 <= w.top <= 285]

    if not data_row_words:
        raise ValueError("Failed to locate the scheme summary row.")

    clusters = _cluster_row_words(data_row_words, gap_threshold=35.0)
    columns = _build_columns_from_clusters(clusters, header_words, section_name=None)

    rows: list[dict[str, str]] = []
    cells: list[ExtractedCell] = []

    for row_words in (data_row_words, total_row_words):
        row_map, row_cells = _extract_row_cells(row_words, columns, section_name=None)
        rows.append(row_map)
        cells.extend(row_cells)

    df = pd.DataFrame(rows, columns=[col.name for col in columns])
    return df, cells


# ---------------------------------------------------------------------------
# Detail sections parsing
# ---------------------------------------------------------------------------


@dataclass
class _ColumnDef:
    name: str
    left: float
    right: float
    center: float
    section: str | None


@dataclass
class _SectionBoundary:
    name: str
    left: float
    right: float


def _parse_detail_sections(words: Sequence[_Word]) -> tuple[dict[str, pd.DataFrame], list[ExtractedCell]]:
    section_boundaries = _detect_sections(words)
    if not section_boundaries:
        return {}, []

    section_tables: dict[str, pd.DataFrame] = {}
    cells: list[ExtractedCell] = []

    for boundary in section_boundaries:
        section_words = [
            w
            for w in words
            if boundary.left <= w.center <= boundary.right and 330 <= w.top <= 420
        ]
        if not section_words:
            continue

        line_groups = _group_words_by_line(section_words, top_tolerance=1.5)

        header_candidates = [(top, group) for top, group in line_groups if top <= 372]
        header_skip_tokens = {"section", "a", "b", "c", ":", "subscriptions", "redemptions", "gains", "losses", "/"}
        header_words = [
            word
            for _, group in header_candidates
            for word in group
            if word.text.lower() not in header_skip_tokens
        ]

        header_max_top = max((top for top, _ in header_candidates), default=0.0)
        data_candidates = [(top, group) for top, group in line_groups if top > header_max_top + 2]

        def _is_total_row(group: list[_Word]) -> bool:
            return any(word.text.strip().startswith("Total") for word in group)

        def _is_data_row(group: list[_Word]) -> bool:
            numeric_tokens = sum(1 for word in group if _looks_like_numeric(word.text))
            return numeric_tokens >= 2

        data_groups = [group for _, group in data_candidates if _is_data_row(group) and not _is_total_row(group)]
        total_groups = [group for _, group in data_candidates if _is_total_row(group)]

        if not data_groups:
            continue

        flattened_data = [word for group in data_groups for word in group]
        clusters = _cluster_row_words(flattened_data, gap_threshold=4.0)
        header_groups = _group_header_columns(header_words, tolerance=24.0)
        if not header_groups:
            columns = _build_columns_from_clusters(clusters, header_words, section_name=boundary.name)
        else:
            cluster_bounds = [
                (min(word.x0 for word in cluster), max(word.x1 for word in cluster))
                for cluster in clusters
            ]
            columns = _columns_from_header_groups(
                header_groups,
                section_name=boundary.name,
                cluster_bounds=cluster_bounds,
            )

        section_rows: list[dict[str, str]] = []

        for group in data_groups:
            row_map, row_cells = _extract_row_cells(group, columns, section_name=boundary.name)
            section_rows.append(row_map)
            cells.extend(row_cells)

        for group in total_groups:
            row_map, row_cells = _extract_row_cells(group, columns, section_name=boundary.name)
            section_rows.append(row_map)
            cells.extend(row_cells)

        df = pd.DataFrame(section_rows, columns=[col.name for col in columns])

        canonical_columns = _canonical_section_columns(boundary.name, len(columns))
        if canonical_columns:
            df.columns = canonical_columns

        section_tables[boundary.name] = df

    return section_tables, cells


def _detect_sections(words: Sequence[_Word]) -> list[_SectionBoundary]:
    section_words = [
        w for w in sorted(words, key=lambda w: (w.top, w.x0)) if 200 <= w.top <= 520 and w.text == "Section"
    ]
    if not section_words:
        return []

    boundaries: list[_SectionBoundary] = []
    centers: list[float] = []
    names: list[str] = []

    for word in section_words:
        sequence = [word]
        index = _word_index(words, word)
        j = index + 1
        while j < len(words):
            next_word = words[j]
            if next_word.text == "Section" and abs(next_word.top - word.top) < 5:
                break
            if abs(next_word.top - word.top) <= 5:
                sequence.append(next_word)
            j += 1
        text = " ".join(w.text for w in sorted(sequence, key=lambda w: w.x0)).strip()
        if not (
            text.startswith("Section A :")
            or text.startswith("Section B :")
            or text.startswith("Section C :")
        ):
            continue
        center = sum(w.center for w in sequence) / len(sequence)
        names.append(text)
        centers.append(center)

    centers_sorted = sorted(zip(centers, names), key=lambda item: item[0])
    centers_only = [item[0] for item in centers_sorted]

    for idx, (center, name) in enumerate(centers_sorted):
        left = (centers_only[idx - 1] + center) / 2 if idx > 0 else 0
        right = (center + centers_only[idx + 1]) / 2 if idx < len(centers_only) - 1 else 1000
        margin = 40.0
        left = max(0.0, left - margin)
        right = min(1000.0, right + margin)
        boundaries.append(_SectionBoundary(name=name, left=left, right=right))

    return boundaries


# ---------------------------------------------------------------------------
# Column and row helpers
# ---------------------------------------------------------------------------


def _cluster_row_words(words: Sequence[_Word], gap_threshold: float) -> list[list[_Word]]:
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: w.x0)
    clusters: list[list[_Word]] = []
    current_cluster: list[_Word] = [sorted_words[0]]

    for word in sorted_words[1:]:
        gap = word.x0 - current_cluster[-1].x1
        if gap > gap_threshold:
            clusters.append(current_cluster)
            current_cluster = [word]
        else:
            current_cluster.append(word)
    clusters.append(current_cluster)

    return clusters


def _build_columns_from_clusters(
    clusters: Sequence[Sequence[_Word]],
    header_words: Sequence[_Word],
    section_name: str | None,
) -> list[_ColumnDef]:
    if not clusters:
        return []

    centers = [
        sum(word.center for word in cluster) / len(cluster) for cluster in clusters
    ]
    bounds = [
        (min(word.x0 for word in cluster), max(word.x1 for word in cluster))
        for cluster in clusters
    ]

    token_groups: dict[int, list[_Word]] = {idx: [] for idx in range(len(clusters))}

    for token in header_words:
        nearest_idx = min(range(len(centers)), key=lambda i: abs(centers[i] - token.center))
        _, max_x = bounds[nearest_idx]
        margin = 5.0
        if token.center > max_x + margin and nearest_idx < len(centers) - 1:
            nearest_idx += 1
        token_groups[nearest_idx].append(token)

    columns: list[_ColumnDef] = []

    for idx, cluster in enumerate(clusters):
        cluster_min = min(word.x0 for word in cluster)
        cluster_max = max(word.x1 for word in cluster)

        if idx == 0:
            left = cluster_min - 5
        else:
            left = (centers[idx - 1] + centers[idx]) / 2

        if idx == len(clusters) - 1:
            right = cluster_max + 5
        else:
            right = (centers[idx] + centers[idx + 1]) / 2

        margin = min(5.0, (right - left) / 4)
        if idx > 0:
            left += margin
        if idx < len(clusters) - 1:
            right -= margin

        center = centers[idx]

        column_tokens = sorted(token_groups[idx], key=lambda w: (w.top, w.x0))
        name = _join_tokens(column_tokens) or "Value"
        columns.append(_ColumnDef(name=name, left=left, right=right, center=center, section=section_name))
    return columns


def _group_header_columns(header_words: Sequence[_Word], tolerance: float) -> list[dict[str, object]]:
    if not header_words:
        return []

    groups: list[dict[str, object]] = []
    for word in sorted(header_words, key=lambda w: w.x0):
        center = word.center
        for group in groups:
            current_center = sum(group["centers"]) / len(group["centers"])
            if abs(current_center - center) <= tolerance:
                group["words"].append(word)
                group["centers"].append(center)
                break
        else:
            groups.append({"words": [word], "centers": [center]})

    for group in groups:
        group["center"] = sum(group["centers"]) / len(group["centers"])
        group["min_x"] = min(word.x0 for word in group["words"])
        group["max_x"] = max(word.x1 for word in group["words"])
        group["name"] = _join_tokens(sorted(group["words"], key=lambda w: (w.top, w.x0)))

    return groups


def _columns_from_header_groups(
    groups: Sequence[dict[str, object]],
    section_name: str | None,
    *,
    cluster_bounds: Sequence[tuple[float, float]] | None = None,
) -> list[_ColumnDef]:
    if not groups:
        return []

    centers = [group["center"] for group in groups]
    columns: list[_ColumnDef] = []
    for idx, group in enumerate(groups):
        min_x = group["min_x"]
        max_x = group["max_x"]
        center = group["center"]

        if idx == 0:
            left = min_x - 5
        else:
            left = (centers[idx - 1] + center) / 2

        if idx == len(groups) - 1:
            right = max_x + 5
        else:
            right = (center + centers[idx + 1]) / 2

        margin = min(5.0, (right - left) / 4)
        if idx > 0:
            left += margin
        if idx < len(groups) - 1:
            right -= margin

        if cluster_bounds and idx < len(cluster_bounds):
            cluster_min, cluster_max = cluster_bounds[idx]
            margin = 3.0
            left = max(left, cluster_min - margin)
            right = max(right, cluster_max + margin)

        columns.append(
            _ColumnDef(
                name=group["name"],
                left=left,
                right=right,
                center=center,
                section=section_name,
            )
        )
    return columns


def _table_to_rows(df: pd.DataFrame) -> list[list[str]]:
    if df.empty:
        return [list(df.columns)]

    df_str = df.fillna("").astype(str)
    rows = [list(df_str.columns)]
    rows.extend(df_str.values.tolist())
    return rows


def _group_words_by_line(words: Sequence[_Word], *, top_tolerance: float) -> list[tuple[float, list[_Word]]]:
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: (w.top, w.x0))
    groups: list[list[_Word]] = [[sorted_words[0]]]

    for word in sorted_words[1:]:
        last_group = groups[-1]
        if abs(word.top - last_group[0].top) <= top_tolerance:
            last_group.append(word)
        else:
            groups.append([word])

    result: list[tuple[float, list[_Word]]] = []
    for group in groups:
        avg_top = sum(w.top for w in group) / len(group)
        result.append((avg_top, group))

    return result


def _canonical_section_columns(section_name: str, column_count: int) -> list[str] | None:
    if section_name.startswith("Section A") and column_count >= 10:
        return [
            "Trxn. Type",
            "Date",
            "Current Units",
            "Source Scheme Units",
            "Original Purchase Cost",
            "**Original Purchase Amount",
            "Grandfathered Nav as on 31/01/2018",
            "GrandFathered Cost Value",
            "IT Applicable NAV",
            "IT Applicable Cost Value",
        ][:column_count]
    if section_name.startswith("Section B") and column_count >= 9:
        return [
            "IT Applicable NAV",
            "IT Applicable Cost Value",
            "Trxn. Type",
            "Date",
            "Units",
            "Amount",
            "Price",
            "Tax Perc",
            "Total Tax",
        ][:column_count]
    if section_name.startswith("Section C") and column_count >= 6:
        return [
            "Tax Perc",
            "Total Tax",
            "Short Term",
            "Indexed Cost",
            "Long Term With Index",
            "Long Term Without Index",
        ][:column_count]
    return None


_NUMERIC_PATTERN = re.compile(r"^[0-9][0-9,./-]*$")


def _looks_like_numeric(text: str) -> bool:
    cleaned = text.strip().replace("₹", "")
    return bool(_NUMERIC_PATTERN.match(cleaned))


def _extract_row_cells(
    row_words: Sequence[_Word],
    columns: Sequence[_ColumnDef],
    section_name: str | None,
) -> tuple[dict[str, str], list[ExtractedCell]]:
    row_map: dict[str, str] = {col.name: "" for col in columns}
    cells: list[ExtractedCell] = []

    for column in columns:
        tokens = [
            word
            for word in sorted(row_words, key=lambda w: w.x0)
            if column.left <= word.center <= column.right
        ]
        value = _join_tokens(tokens)
        if value:
            row_map[column.name] = value
            cells.append(
                ExtractedCell(
                    section=section_name,
                    column=column.name,
                    value_text=value,
                    words=tuple(tokens),
                )
            )
        else:
            row_map[column.name] = ""

    return row_map, cells


def _join_tokens(tokens: Sequence[_Word]) -> str:
    cleaned: list[str] = []
    for token in tokens:
        candidate = token.text.strip()
        if not candidate:
            continue
        if cleaned and candidate == cleaned[-1]:
            continue
        cleaned.append(candidate)
    return " ".join(cleaned).strip()


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def _first_match(words: Iterable[_Word], predicate) -> _Word | None:
    for word in words:
        if predicate(word):
            return word
    return None


def _normalize_spaced_tokens(tokens: Sequence[str]) -> str:
    rebuilt: list[str] = []
    buffer = ""
    for token in tokens:
        if len(token) == 1 and token.isalpha():
            buffer += token
            continue
        if buffer:
            if token.isalpha():
                rebuilt.append(buffer + token)
            else:
                rebuilt.append(buffer)
                rebuilt.append(token)
            buffer = ""
        else:
            rebuilt.append(token)
    if buffer:
        rebuilt.append(buffer)
    return " ".join(rebuilt)


def _word_from_pdf(word_dict: dict[str, float | str], *, page_index: int) -> _Word:
    return _Word(
        text=str(word_dict["text"]),
        x0=float(word_dict["x0"]),
        x1=float(word_dict["x1"]),
        top=float(word_dict["top"]),
        bottom=float(word_dict["bottom"]),
        page_index=page_index,
    )


def _word_index(words: Sequence[_Word], target: _Word) -> int:
    for idx, word in enumerate(words):
        if word is target:
            return idx
    return -1
