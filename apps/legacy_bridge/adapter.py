import contextlib
import json
import os
import pathlib
import sys
import types
from typing import Any, Dict, Sequence, Tuple

LEGACY_BASE_DIR = os.path.abspath(os.getenv("LEGACY_BASE_DIR", "old_endpoints"))


@contextlib.contextmanager
def chdir(path: str):
    prev = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev)


def _patch_missing_stdlib(module_name: str) -> None:
    if module_name != "lib2to3":
        raise
    lib_module = types.ModuleType("lib2to3")
    pytree = types.ModuleType("lib2to3.pytree")

    def _unavailable(*_: Any, **__: Any) -> None:  # pragma: no cover - diagnostic helper
        raise RuntimeError("lib2to3.pytree.convert is unavailable on this interpreter")

    pytree.convert = _unavailable
    lib_module.pytree = pytree  # type: ignore[attr-defined]
    sys.modules.setdefault("lib2to3", lib_module)
    sys.modules.setdefault("lib2to3.pytree", pytree)


def _import_legacy_symbols():
    legacy_dir = pathlib.Path(LEGACY_BASE_DIR).resolve()
    if not legacy_dir.exists():
        raise FileNotFoundError(f"Legacy directory {legacy_dir} does not exist")

    if str(legacy_dir) not in sys.path:
        sys.path.insert(0, str(legacy_dir))

    argv_backup = list(sys.argv)
    sys.argv = argv_backup[:1]
    try:
        try:
            from backend.tax_professional.banks.CA_Statement_Analyzer import (  # type: ignore
                start_extraction_add_pdf,
                save_to_excel,
            )
        except ModuleNotFoundError as exc:  # pragma: no cover - import guard
            if exc.name != "lib2to3":
                raise
            _patch_missing_stdlib(exc.name)
            from backend.tax_professional.banks.CA_Statement_Analyzer import (  # type: ignore pylint: disable=import-error
                start_extraction_add_pdf,
                save_to_excel,
            )
    finally:
        sys.argv = argv_backup

    return start_extraction_add_pdf, save_to_excel


def _infer_bank_names(paths: Sequence[pathlib.Path]) -> Sequence[str]:
    seen: Dict[str, int] = {}
    names: list[str] = []
    for path in paths:
        stem = path.stem or "statement"
        count = seen.get(stem, 0)
        if count:
            names.append(f"{stem}_{count}")
        else:
            names.append(stem)
        seen[stem] = count + 1
    return names


def _normalise_paths(pdf_paths: Sequence[str]) -> list[pathlib.Path]:
    resolved = []
    for raw in pdf_paths:
        path = pathlib.Path(raw).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")
        resolved.append(path)
    return resolved


def run_legacy(
    pdf_paths: Sequence[str],
    *,
    ocr: bool = True,
    bank_names: Sequence[str] | None = None,
    passwords: Sequence[str] | None = None,
    start_dates: Sequence[str] | None = None,
    end_dates: Sequence[str] | None = None,
) -> Tuple[str, Dict[str, Any]]:
    if not pdf_paths:
        raise ValueError("No PDFs provided")

    resolved_paths = _normalise_paths(pdf_paths)
    legacy_dir = pathlib.Path(LEGACY_BASE_DIR).resolve()

    with chdir(str(legacy_dir)):
        start_extraction_add_pdf, save_to_excel = _import_legacy_symbols()

        # Use provided bank names or infer from filenames
        if not bank_names:
            bank_names = list(_infer_bank_names(resolved_paths))

        # Prepare parameters with defaults if not provided
        num_files = len(bank_names)
        passwords = list(passwords) if passwords else [""] * num_files
        start_dates = list(start_dates) if start_dates else [""] * num_files
        end_dates = list(end_dates) if end_dates else [""] * num_files

        progress_data = {"progress_func": lambda *_: None, "current_progress": 0, "total_progress": 100}

        result = start_extraction_add_pdf(  # type: ignore[misc]
            list(bank_names),
            [str(path) for path in resolved_paths],
            passwords,
            start_dates,
            end_dates,
            "CODEx-bridge",
            progress_data,
            whole_transaction_sheet=None,
            aiyazs_array_of_array=None,
        )

        if not isinstance(result, dict):
            raise RuntimeError(f"Legacy entrypoint returned unexpected payload: {type(result)}")

        # Log what we got from legacy system
        print(f"DEBUG: Legacy result keys: {list(result.keys())}")
        print(f"DEBUG: pdf_paths_not_extracted: {result.get('pdf_paths_not_extracted')}")

        raw_json = result.get("sheets_in_json")
        if not raw_json:
            error_details = {
                "result_keys": list(result.keys()),
                "pdf_paths_not_extracted": result.get("pdf_paths_not_extracted"),
                "success_page_number": result.get("success_page_number"),
            }
            raise RuntimeError(f"Legacy entrypoint did not return sheet data. Result: {json.dumps(error_details)}")

        sheets_payload = json.loads(raw_json)
        transactions = sheets_payload.get("Transactions") or []
        name_n_num = sheets_payload.get("Name Acc No") or []

        if not transactions:
            raise RuntimeError("Legacy extraction produced no transactions")

        import pandas as pd  # Imported lazily to avoid unnecessary dependency at module import

        transaction_df = pd.DataFrame(transactions)
        name_n_num_df = pd.DataFrame(name_n_num) if name_n_num else pd.DataFrame()

        # Fallback so excel export still works if legacy data misses account info
        if name_n_num_df.empty:
            name_n_num_df = pd.DataFrame(
                [
                    {"index": "Account Number", 0: resolved_paths[0].stem},
                    {"index": "Account Name", 0: ""},
                    {"index": "Bank", 0: bank_names[0]},
                ]
            )

        case_name = resolved_paths[0].stem or "legacy_report"
        excel_path = save_to_excel(transaction_df, name_n_num_df, case_name)  # type: ignore[misc]

        excel_path = os.path.abspath(excel_path)
        if not os.path.exists(excel_path):
            raise FileNotFoundError(f"Legacy Excel not found at {excel_path}")

        summary: Dict[str, Any] = {
            "pdfs": [str(path) for path in resolved_paths],
            "excel_path": excel_path,
            "sheets_data": sheets_payload,  # Include raw JSON data from legacy system
            "legacy": {
                "missing_months_list": result.get("missing_months_list"),
                "pdf_paths_not_extracted": result.get("pdf_paths_not_extracted"),
                "success_page_number": result.get("success_page_number"),
            },
            "ocr": ocr,
        }

        return excel_path, summary
