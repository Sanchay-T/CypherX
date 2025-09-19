# `apps/legacy_bridge/adapter.py` — Full Walkthrough

This document explains every line of the legacy bridge so you can read
it top to bottom without guessing how anything works. We cover what each
helper does, why it exists, and how to call the public entry point
(`run_legacy`).

---

## 1. Imports and constants

```python
import contextlib
import json
import os
import pathlib
import sys
import types
from typing import Any, Dict, Sequence, Tuple
```

- `contextlib` supplies the `@contextmanager` decorator so we can build a
  simple `chdir` helper.
- `json` converts the legacy pipeline’s string output into Python data.
- `os`, `pathlib`, `sys`, `types` are used to locate the legacy code, mess
  with `sys.path`, and manufacture stub modules.
- Typing aliases keep signatures explicit.

```python
LEGACY_BASE_DIR = os.path.abspath(os.getenv("LEGACY_BASE_DIR", "old_endpoints"))
```

The adapter defaults to the `old_endpoints` folder in repo root. Setting
`LEGACY_BASE_DIR` lets you point it somewhere else (e.g. a mounted volume
in production). We resolve to an absolute path immediately so every other
function can rely on it without guessing the working directory.

---

## 2. `chdir` context manager

```python
@contextlib.contextmanager
def chdir(path: str):
    prev = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev)
```

Legacy modules open files relative to their package root. This helper
ensures we temporarily `cd` into that directory before importing/calling
legacy functions, then restore the old cwd even on error. Usage:

```python
with chdir("/tmp"):  # CWD is /tmp
    ...
# once the block exits, the original CWD is restored
```

---

## 3. `_patch_missing_stdlib`

```python
def _patch_missing_stdlib(module_name: str) -> None:
    if module_name != "lib2to3":
        raise
    lib_module = types.ModuleType("lib2to3")
    pytree = types.ModuleType("lib2to3.pytree")

    def _unavailable(*_: Any, **__: Any) -> None:
        raise RuntimeError("lib2to3.pytree.convert is unavailable on this interpreter")

    pytree.convert = _unavailable
    lib_module.pytree = pytree
    sys.modules.setdefault("lib2to3", lib_module)
    sys.modules.setdefault("lib2to3.pytree", pytree)
```

Python 3.13 removed `lib2to3` from the standard library, but the legacy
project still imports `from lib2to3.pytree import convert`. When that
import fails, `_patch_missing_stdlib` stubs the module so the rest of the
file loads. If some other module import failed we re‑raise—it’s not a
generic “swallow all errors” hook.

The stub’s `convert()` raises a `RuntimeError` if anyone calls it so we
get a loud failure instead of silent bad behaviour.

---

## 4. `_import_legacy_symbols`

```python
def _import_legacy_symbols():
    legacy_dir = pathlib.Path(LEGACY_BASE_DIR).resolve()
    if not legacy_dir.exists():
        raise FileNotFoundError(...)

    if str(legacy_dir) not in sys.path:
        sys.path.insert(0, str(legacy_dir))

    argv_backup = list(sys.argv)
    sys.argv = argv_backup[:1]
    try:
        try:
            from backend.tax_professional.banks.CA_Statement_Analyzer import ...
        except ModuleNotFoundError as exc:
            if exc.name != "lib2to3":
                raise
            _patch_missing_stdlib(exc.name)
            from backend.tax_professional.banks.CA_Statement_Analyzer import ...
    finally:
        sys.argv = argv_backup

    return start_extraction_add_pdf, save_to_excel
```

Responsibilities:

1. Resolve and validate the legacy base directory.
2. Push that directory onto `sys.path` so Python can import
   `backend.*` packages even when the modern app has a different cwd.
3. Temporarily reset `sys.argv` to mimic a clean module import. The
   legacy files sometimes parse arguments on import; giving them a
   one-element list (program name) avoids unexpected `argparse` failures.
4. Import the two functions we actually need. If the import dies because
   `lib2to3` is missing, we create the stub and retry.
5. Always restore `sys.argv` (even if import blows up).

This function returns the callable objects so downstream code can invoke
legacy logic without manual imports.

---

## 5. `_infer_bank_names`

```python
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
```

The legacy entrypoint expects `bank_names` and `pdf_paths` arrays to be in
sync. We derive bank names from file names (`Axis.pdf` → `Axis`). If
multiple PDFs share the same stem we suffix them (`Axis_1`, `Axis_2`…)
so names remain unique.

---

## 6. `_normalise_paths`

```python
def _normalise_paths(pdf_paths: Sequence[str]) -> list[pathlib.Path]:
    resolved = []
    for raw in pdf_paths:
        path = pathlib.Path(raw).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")
        resolved.append(path)
    return resolved
```

Turns user inputs into absolute `Path` objects, expanding `~` and
raising immediately if a file is missing. Returning absolute paths keeps
later code deterministic even if working directories change.

---

## 7. `run_legacy` — public API

```python
def run_legacy(pdf_paths: Sequence[str], *, ocr: bool = True) -> Tuple[str, Dict[str, Any]]:
```

### 7.1 Input validation & setup

- Enforces at least one PDF (`ValueError` otherwise).
- Normalises paths and resolves the legacy directory.
- Enters `with chdir(legacy_dir)` so relative imports/data files inside
  the legacy module resolve correctly.

### 7.2 Calling the legacy pipeline

Inside the context manager:

1. Load `start_extraction_add_pdf` & `save_to_excel` via
   `_import_legacy_symbols()`.
2. Build `bank_names` using `_infer_bank_names` and create placeholder
   arrays (`blanks`) for passwords/start dates/end dates because the
   legacy function requires them even when empty.
3. Compose a minimal `progress_data` dict with a no‑op callback.
4. Call `start_extraction_add_pdf`. Signature (simplified):

   ```python
   start_extraction_add_pdf(
       bank_names,
       pdf_paths,
       passwords,
       start_dates,
       end_dates,
       ca_id,
       progress_data,
       whole_transaction_sheet=None,
       aiyazs_array_of_array=None,
   )
   ```

   We pass a dummy `ca_id` string (`"CODEx-bridge"`).

### 7.3 Validating the legacy response

- The legacy function returns a dict (historically consumed by their old
  FastAPI endpoint). We confirm the type and ensure the `"sheets_in_json"`
  key is present.
- Deserialize that JSON string: it contains tabular data for multiple
  worksheets.
- Extract two key collections: `"Transactions"` (list of row dicts) and
  `"Name Acc No"` (account metadata).
- If `Transactions` is empty we bail out because there is nothing to
  generate.

### 7.4 Rebuilding DataFrames and exporting Excel

- Import pandas lazily so the module loads quickly when no one calls
  `run_legacy`.
- Build `transaction_df` and `name_n_num_df` from the JSON structures.
- If the legacy output somehow omits account metadata, synthesize a small
  DataFrame so the Excel exporter (which expects specific columns) still
  succeeds.
- Compute `case_name` using the first PDF file stem.
- Call `save_to_excel(transaction_df, name_n_num_df, case_name)`. This is
  a function defined in the legacy project that writes the actual Excel
  file and returns its path.
- Convert the path to absolute form and verify it exists.

### 7.5 Return value

The function returns `(excel_path, summary_dict)` where:

```python
summary = {
    "pdfs": [str(path) for path in resolved_paths],
    "excel_path": excel_path,
    "legacy": {
        "missing_months_list": result.get("missing_months_list"),
        "pdf_paths_not_extracted": result.get("pdf_paths_not_extracted"),
        "success_page_number": result.get("success_page_number"),
    },
    "ocr": ocr,
}
```

This summary mirrors what the old API returned and can be serialized in
new endpoints for debugging/logging.

---

## 8. Example usage

```python
from apps.legacy_bridge.adapter import run_legacy

excel_path, info = run_legacy([
    "apps/statements/AXIS.pdf",
    "~/Downloads/OtherStatement.pdf",
])
print("Excel report at:", excel_path)
print("Processed PDFs:", info["pdfs"])
print("Missing months:", info["legacy"]["missing_months_list"])
```

Key behaviours to remember:

- Working directory switches automatically; you don’t need to `cd`.
- Errors bubble with actionable messages (missing files, malformed
  legacy output, absent Excel file).
- `ocr` is currently a passthrough flag stored in the summary for future
  use when hooking into asynchronous workers.

---

## 9. Call flow diagram

```
run_legacy()
 ├─ _normalise_paths() -> absolute Paths
 ├─ with chdir(LEGACY_BASE_DIR):
 │    ├─ _import_legacy_symbols() -> legacy functions
 │    ├─ _infer_bank_names()
 │    ├─ start_extraction_add_pdf(...)
 │    ├─ json.loads(sheets_in_json)
 │    ├─ pandas.DataFrame(...) for transactions + account info
 │    └─ save_to_excel(...) -> Excel path
 └─ return (excel_path, summary)
```

---

## 10. Troubleshooting tips

- **`FileNotFoundError: Legacy directory ...`** – ensure the
  `old_endpoints` folder exists or override `LEGACY_BASE_DIR`.
- **`ModuleNotFoundError` for other modules** – means the legacy project
  requires additional dependencies. Install or vendor them just like we
  did for pandas/PyMuPDF/etc.
- **Excel path missing** – check that `save_to_excel` writes into a temp
  location that your environment allows (e.g., macOS `/var/folders/...`).
- **`RuntimeError: Legacy entrypoint did not return sheet data`** – the
  legacy analyzer failed, likely because it couldn’t parse the PDF. The
  summary dict still contains `pdf_paths_not_extracted` for diagnosis.

With this map you can tweak the adapter confidently, hook it into new
FastAPI endpoints, or port it to a background worker without surprises.
