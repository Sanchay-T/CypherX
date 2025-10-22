# Analyzed Statements Feature Documentation

## Overview

The **Analyzed Statements** feature provides a comprehensive bank statement analysis system with Excel-like data visualization. It processes PDF bank statements through a legacy extraction system, generates Excel files with multiple sheets, and displays the data in an interactive, Excel-like table interface in the browser.

## Table of Contents

1. [Architecture](#architecture)
2. [User Flow](#user-flow)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Features](#features)
6. [API Documentation](#api-documentation)
7. [Technical Details](#technical-details)
8. [Future Enhancements](#future-enhancements)

---

## Architecture

### High-Level Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│   Browser   │─────▶│  Next.js API │─────▶│  FastAPI Backend│─────▶│Legacy Python │
│  (React)    │      │   Proxy      │      │   (Pipeline)    │      │  Extraction  │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────────┘
      │                                              │                        │
      │                                              │                        │
      ▼                                              ▼                        ▼
┌─────────────┐                            ┌─────────────────┐      ┌──────────────┐
│Excel-like   │                            │  Job Storage    │      │  Excel File  │
│Table View   │◀───────────────────────────│  (JSON + Files) │◀─────│  Generation  │
└─────────────┘                            └─────────────────┘      └──────────────┘
```

### Technology Stack

**Backend:**
- FastAPI (Python)
- pandas (Data processing)
- openpyxl (Excel generation)
- Legacy extraction system (CA_Statement_Analyzer)

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Shadcn UI components
- Lucide icons

---

## User Flow

### 1. Upload Statement

```
User navigates to /dashboard/statements
  ↓
Clicks "Upload Statement" button
  ↓
Upload dialog opens with form fields:
  - PDF file (drag-drop or browse)
  - Bank Name (optional, e.g., "AXIS", "HDFC")
  - PDF Password (optional, for encrypted PDFs)
  - Financial Year (dropdown: 2020-2021 to 2025-2026)
  - Report Instructions (optional, for AI report)
  - Report Template (optional, e.g., "lending_india")
  ↓
Clicks "Upload & Analyze"
  ↓
Job created and processing starts
```

### 2. Processing Pipeline

```
Job Status: queued
  ↓
Job Status: running
  ↓
OCR Step (optional, skipped if Mistral auth not available)
  ↓
Legacy Extraction (PDF → JSON)
  - Extracts transactions
  - Categorizes data
  - Generates multiple sheets
  ↓
Excel Generation (JSON → .xlsx)
  - 17+ sheets created:
    • Summary
    • Transactions
    • EOD (End of Day)
    • Investment
    • Creditors
    • Debtors
    • UPI-CR / UPI-DR
    • Cash Withdrawal / Deposit
    • Redemption, Dividend & Interest
    • Probable EMI
    • Refund-Reversal
    • Suspense Credit / Debit
    • Payment & Receipt Voucher
  ↓
Job Status: completed
```

### 3. View Data

```
User sees completed job in list
  ↓
Clicks "View Data" button
  ↓
Navigates to /dashboard/statements/{job_id}
  ↓
Frontend fetches:
  1. Job status/metadata
  2. Excel data (all sheets as JSON)
  ↓
Excel-like table renders with:
  - Sheet tabs (17+ tabs)
  - Resizable columns
  - Sticky headers
  - Frozen row numbers
  - Formatted numbers
  - Fullscreen mode
  - Export CSV
```

---

## Backend Implementation

### File Structure

```
apps/
├── api/
│   └── routers/
│       └── statements.py          # API endpoints
├── domain/
│   └── services/
│       └── statements.py          # Business logic & pipeline
└── legacy_bridge/
    └── adapter.py                 # Bridge to legacy extraction system
```

### Key Components

#### 1. API Router (`apps/api/routers/statements.py`)

**Endpoints:**

- `POST /ai/statements/normalize` - Upload and process PDF
- `GET /ai/statements/` - List all jobs
- `GET /ai/statements/{job_id}` - Get job status and metadata
- `GET /ai/statements/{job_id}/excel` - Download Excel file
- `GET /ai/statements/{job_id}/excel-data` - Get all sheets as JSON
- `GET /ai/statements/{job_id}/report` - Download AI-generated PDF report

#### 2. Pipeline Service (`apps/domain/services/statements.py`)

**Key Classes:**

```python
@dataclass
class StatementJobContext:
    job_id: str
    file_path: Path
    file_name: str
    bank_name: str | None
    password: str | None
    financial_year: str | None  # e.g., "2022-2023"
    prompt: str | None
    template: str | None

    def parse_financial_year(self) -> tuple[str, str]:
        """Parse FY into start/end dates (DD-MM-YYYY format)"""
        # "2022-2023" → ("01-04-2022", "31-03-2023")
```

**Pipeline Flow:**

1. **Job Creation** - Store PDF, create job record
2. **OCR (Optional)** - Mistral OCR for scanned documents
3. **Legacy Extraction** - Call old Python extraction system
4. **Excel Generation** - Create multi-sheet Excel file
5. **Preview Generation** - Create JSON preview with 10 rows
6. **AI Report (Optional)** - Generate custom PDF report

#### 3. Legacy Bridge (`apps/legacy_bridge/adapter.py`)

**Purpose:** Interface between new FastAPI system and legacy extraction code

**Key Function:**

```python
def run_legacy(
    pdf_paths: Sequence[str],
    *,
    ocr: bool = True,
    bank_names: Sequence[str] | None = None,
    passwords: Sequence[str] | None = None,
    start_dates: Sequence[str] | None = None,
    end_dates: Sequence[str] | None = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Calls legacy CA_Statement_Analyzer
    Returns: (excel_path, summary_dict)

    summary_dict includes:
      - sheets_data: Full JSON of all sheets
      - legacy metadata (missing months, errors, etc.)
    """
```

### Data Flow

```python
# 1. Upload
POST /ai/statements/normalize
  ↓
create_job() → stores PDF in .cypherx/jobs/{job_id}/

# 2. Processing
_run_job() → _run_legacy() → legacy extraction
  ↓
Returns: excel_path + sheets_data (JSON)

# 3. Storage
Job result structure:
{
  "file_name": "AXIS.pdf",
  "excel": {
    "path": "/path/to/statement.xlsx",
    "download_token": "abc123..."
  },
  "sheets_available": true,
  "preview": {
    "totals": {"credits": 1260345, "debits": 1269533},
    "transactions": [...first 10 rows...]
  },
  "stages": [...],
  "completed_at": "2025-09-30T07:49:30Z"
}

# 4. Retrieval
GET /ai/statements/{job_id}/excel-data?token={token}
  ↓
read Excel file with pandas
  ↓
Return:
{
  "job_id": "...",
  "file_name": "AXIS.pdf",
  "sheet_names": ["Summary", "Transactions", ...],
  "sheets": {
    "Transactions": {
      "columns": ["Value Date", "Description", "Debit", ...],
      "data": [{...}, {...}],
      "row_count": 14,
      "column_count": 9
    },
    ...
  }
}
```

---

## Frontend Implementation

### File Structure

```
src/
├── app/
│   ├── (console)/
│   │   └── dashboard/
│   │       └── statements/
│   │           ├── page.tsx                    # List page
│   │           └── [job_id]/
│   │               └── page.tsx                # Detail page
│   └── api/
│       └── ai/
│           └── statements/
│               ├── route.ts                    # Proxy: List jobs
│               ├── upload/
│               │   └── route.ts                # Proxy: Upload
│               └── [job_id]/
│                   ├── route.ts                # Proxy: Get job
│                   ├── excel/
│                   │   └── route.ts            # Proxy: Download Excel
│                   └── excel-data/
│                       └── route.ts            # Proxy: Get JSON data
├── components/
│   └── statements/
│       ├── upload-statement-dialog.tsx         # Upload modal
│       └── excel-table.tsx                     # Excel-like table
└── config/
    └── navigation.ts                           # Sidebar nav config
```

### Key Components

#### 1. Statements List Page (`statements/page.tsx`)

**Features:**
- Displays all processed statements
- Status indicators (completed, running, failed)
- Auto-refresh every 5 seconds
- "Upload Statement" button
- "View Data" button for completed jobs

**Component Structure:**
```tsx
export default function StatementsPage() {
  const [jobs, setJobs] = useState<StatementJob[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <DashboardHeader title="Analyzed Statements" />
      <Table>
        {/* Job list with status badges */}
      </Table>
      <UploadStatementDialog />
    </>
  );
}
```

#### 2. Upload Dialog (`upload-statement-dialog.tsx`)

**Features:**
- Drag-and-drop file upload
- Form validation
- Financial year dropdown
- Optional fields (bank name, password, AI report config)
- Success/error toast notifications

**Form Fields:**
```tsx
interface UploadForm {
  file: File;                      // Required
  bank_name?: string;              // Optional (e.g., "AXIS", "HDFC")
  password?: string;               // Optional (for encrypted PDFs)
  financial_year?: string;         // Optional (e.g., "2022-2023")
  report_prompt?: string;          // Optional (AI report instructions)
  report_template?: string;        // Optional ("standard", "lending_india")
}
```

**Financial Year Options:**
- 2020-2021
- 2021-2022
- 2022-2023
- 2023-2024
- 2024-2025
- 2025-2026

**Parsing Logic:**
```
"2022-2023" →
  start_date: "01-04-2022" (April 1, 2022)
  end_date: "31-03-2023" (March 31, 2023)
```

#### 3. Statement Detail Page (`statements/[job_id]/page.tsx`)

**Features:**
- Displays job metadata (filename, completion time)
- Back button to list page
- Download Excel button
- Sheet tabs (17+ tabs)
- Excel-like table component

**Data Fetching:**
```tsx
const fetchJobDetails = async () => {
  // 1. Get job status
  const jobData = await fetch(`/api/ai/statements/${jobId}`).then(r => r.json());

  // 2. If completed, fetch Excel data
  if (jobData.status === "completed" && jobData.result?.excel?.download_token) {
    const token = jobData.result.excel.download_token;
    const excelData = await fetch(
      `/api/ai/statements/${jobId}/excel-data?token=${token}`
    ).then(r => r.json());

    jobData.result.sheets_data = excelData.sheets;
  }

  setJob(jobData);
};
```

#### 4. Excel Table Component (`excel-table.tsx`)

**The Star of the Show!** This is where all the magic happens.

**Features:**

1. **Excel-like Interface**
   - Sticky header row (stays visible when scrolling)
   - Frozen row numbers column (stays visible when scrolling horizontally)
   - Zebra striping (alternating row colors)
   - Hover effects on rows

2. **Column Resizing** (Just like Excel!)
   - Hover over column border to see resize cursor
   - Click and drag to adjust width
   - Visual feedback (blue highlight)
   - Minimum width: 60px
   - Independent column widths

3. **Smart Formatting**
   - **Numeric columns** (Debit, Credit, Balance):
     - Right-aligned
     - Monospace font
     - Indian number format: `1,26,03,45.00`
   - **Date columns**:
     - Fixed width (110px)
   - **Description columns**:
     - Text wrapping enabled
     - Word break for long strings
     - Default width: 250px (adjustable)
   - **Other columns**:
     - Truncate with ellipsis (...)
     - Show full text on hover (future)

4. **Responsive Design**
   - Horizontal scroll for all columns
   - Vertical scroll for many rows
   - Max height: `calc(100vh - 320px)` (normal), `calc(100vh - 180px)` (fullscreen)
   - Mobile scroll hints

5. **Fullscreen Mode**
   - Click "Fullscreen" button
   - Table expands to fill entire screen
   - More viewing space
   - Press ESC or click "Exit Fullscreen" to exit

6. **Export to CSV**
   - One-click export of current sheet
   - Proper CSV escaping (handles commas, quotes)
   - Filename: `{SheetName}_{Date}.csv`

7. **Stats Display**
   - Shows total row count
   - Shows total column count
   - Updates in real-time

**Component Architecture:**

```tsx
export function ExcelTable({ data, sheetName }: ExcelTableProps) {
  // State management
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize default column widths
  useEffect(() => {
    const initialWidths: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.includes("date")) initialWidths[col] = 110;
      else if (col.includes("description")) initialWidths[col] = 250;
      else if (isNumericColumn(col)) initialWidths[col] = 130;
      // ... etc
    });
    setColumnWidths(initialWidths);
  }, [columns]);

  // Column resize logic
  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    setResizing(column);
    // Track starting position and width
  };

  useEffect(() => {
    if (resizing) {
      // Listen to mouse move and update width
      // Listen to mouse up to stop resizing
    }
  }, [resizing]);

  return (
    <div>
      {/* Stats Bar */}
      <div>
        <Badge>{stats.rowCount} rows</Badge>
        <Badge>{stats.columnCount} columns</Badge>
        <Button onClick={toggleFullscreen}>Fullscreen</Button>
        <Button onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {/* Table */}
      <table style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '56px' }}>#</th>
            {columns.map(col => (
              <th key={col} style={{ width: `${columnWidths[col]}px` }}>
                {col}
                {/* Resize handle */}
                <div onMouseDown={(e) => handleResizeStart(e, col)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {columns.map(col => (
                <td key={col} style={{ width: `${columnWidths[col]}px` }}>
                  {formatCellValue(row[col], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Features

### Core Features

✅ **PDF Upload & Processing**
- Drag-and-drop upload
- Multiple bank support (AXIS, HDFC, ICICI, etc.)
- Password-protected PDFs
- Financial year filtering

✅ **Excel Generation**
- 17+ automated sheets
- Transaction categorization
- UPI transaction splitting
- Investment tracking
- Creditor/Debtor analysis
- EMI detection
- Suspense account tracking

✅ **Excel-like Table Viewer**
- Interactive browser-based spreadsheet
- No Excel installation required
- Multiple sheet tabs
- Resizable columns (drag to resize)
- Frozen headers and row numbers
- Smart text wrapping
- Number formatting (Indian format)
- Zebra striping
- Hover effects

✅ **Data Export**
- Download original Excel file
- Export individual sheets as CSV
- Preserves all data and formatting

✅ **Job Management**
- Real-time status updates
- Job history tracking
- Auto-refresh (5-second polling)
- Error handling and display

### Advanced Features

✅ **Financial Year Support**
- Indian FY format (Apr 1 - Mar 31)
- Automatic date range calculation
- Validation against PDF content

✅ **Fullscreen Mode**
- Immersive data viewing
- Native browser fullscreen
- Keyboard shortcut (ESC to exit)
- Responsive layout adjustments

✅ **Responsive Design**
- Desktop-optimized
- Tablet-friendly
- Mobile scroll hints
- Adaptive column widths

✅ **Performance Optimizations**
- Client-side caching
- Lazy loading (only fetch when viewing)
- Efficient re-renders (React.useMemo)
- No full Excel file in API responses

✅ **Security**
- Download tokens for Excel files
- Job-based access control
- Server-side validation
- Secure file storage

---

## API Documentation

### Base URL
```
Backend: http://localhost:8000
Frontend Proxy: http://localhost:3000/api
```

### Endpoints

#### 1. Upload Statement

```http
POST /ai/statements/normalize
Content-Type: multipart/form-data

Parameters (FormData):
- file: File (required) - PDF file
- bank_name: string (optional) - Bank name
- password: string (optional) - PDF password
- financial_year: string (optional) - Format: "YYYY-YYYY"
- report_prompt: string (optional) - Custom AI report instructions
- report_template: string (optional) - Template name

Response (200):
{
  "job_id": "abc123...",
  "status": "queued",
  "payload": {
    "file_name": "AXIS.pdf",
    "bank_name": "AXIS",
    "financial_year": "2022-2023",
    ...
  },
  "result": null,
  "created_at": "2025-09-30T07:49:26Z",
  "updated_at": "2025-09-30T07:49:26Z"
}
```

#### 2. List Jobs

```http
GET /ai/statements/

Response (200):
{
  "jobs": [
    {
      "job_id": "abc123...",
      "status": "completed",
      "payload": {...},
      "result": {
        "file_name": "AXIS.pdf",
        "excel": {
          "path": "/path/to/excel",
          "download_token": "xyz789..."
        },
        "sheets_available": true,
        "preview": {...},
        "stages": [...],
        "completed_at": "2025-09-30T07:49:30Z"
      },
      "created_at": "...",
      "updated_at": "..."
    },
    ...
  ]
}
```

#### 3. Get Job Status

```http
GET /ai/statements/{job_id}

Response (200):
{
  "job_id": "abc123...",
  "status": "completed",
  "result": {...},
  ...
}
```

#### 4. Get Excel Data (JSON)

```http
GET /ai/statements/{job_id}/excel-data?token={download_token}

Response (200):
{
  "job_id": "abc123...",
  "file_name": "AXIS.pdf",
  "sheet_names": ["Summary", "Transactions", "EOD", ...],
  "sheets": {
    "Transactions": {
      "columns": ["Value Date", "Description", "Debit", "Credit", "Balance", ...],
      "data": [
        {
          "Value Date": "01-04-2022",
          "Description": "openingbalance",
          "Debit": 0,
          "Credit": 0,
          "Balance": 74738.87,
          "Category": "Suspense",
          "Entity": "-",
          "Bank": "axis0",
          "Voucher type": "-"
        },
        ...
      ],
      "row_count": 14,
      "column_count": 9
    },
    ...
  }
}
```

#### 5. Download Excel File

```http
GET /ai/statements/{job_id}/excel?token={download_token}

Response (200):
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=statement.xlsx

[Binary Excel file]
```

#### 6. Download PDF Report

```http
GET /ai/statements/{job_id}/report

Response (200):
Content-Type: application/pdf
Content-Disposition: attachment; filename=report.pdf

[Binary PDF file]
```

### Error Responses

```http
400 Bad Request - Invalid input
{
  "detail": "Empty file upload"
}

403 Forbidden - Invalid token
{
  "detail": "Invalid download token"
}

404 Not Found - Job or file not found
{
  "detail": "Job not found"
}

415 Unsupported Media Type - Wrong file type
{
  "detail": "Only PDF uploads are supported"
}

500 Internal Server Error - Server error
{
  "detail": "Internal server error"
}
```

---

## Technical Details

### Financial Year Parsing

```python
def parse_financial_year(self) -> tuple[str, str]:
    """
    Parse financial year into start and end dates.

    Examples:
      "2022-2023" → ("01-04-2022", "31-03-2023")
      "2022-23" → ("01-04-2022", "31-03-2023")

    Returns:
      Tuple of (start_date, end_date) in DD-MM-YYYY format
    """
    if not self.financial_year:
        return ("", "")

    parts = self.financial_year.split("-")
    start_year = int(parts[0])

    # Handle 2-digit year
    if len(parts[1]) == 2:
        end_year = int(f"20{parts[1]}")
    else:
        end_year = int(parts[1])

    # Indian Financial Year: April 1 to March 31
    start_date = f"01-04-{start_year}"
    end_date = f"31-03-{end_year}"

    return (start_date, end_date)
```

### Job Storage Structure

```
.cypherx/jobs/{job_id}/
├── statement.pdf          # Original uploaded PDF
├── statement.xlsx         # Generated Excel file
└── report.pdf            # AI-generated report (if applicable)

Job Record (in-memory or DB):
{
  "job_id": "...",
  "status": "queued|running|completed|failed",
  "payload": {
    "file_name": "...",
    "bank_name": "...",
    "financial_year": "...",
    ...
  },
  "result": {
    "file_name": "...",
    "excel": {"path": "...", "download_token": "..."},
    "sheets_available": true,
    "preview": {...},
    "stages": [...],
    "completed_at": "..."
  },
  "error": null | "error message",
  "created_at": "...",
  "updated_at": "..."
}
```

### Column Width Management

```typescript
// Default widths (pixels)
const DEFAULT_WIDTHS = {
  date: 110,
  description: 250,
  numeric: 130,     // Debit, Credit, Balance
  category: 140,
  entity: 140,
  bank: 100,
  voucher: 120,
  default: 120
};

// Dynamic resizing
interface ColumnWidths {
  [columnName: string]: number;
}

// User can resize: 60px (min) to unlimited (max)
const newWidth = Math.max(60, startWidth + deltaX);
```

### Number Formatting

```typescript
// Indian number format with 2 decimal places
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Examples:
// 24000 → "24,000.00"
// 838166 → "8,38,166.00"
// 1260345 → "12,60,345.00"
```

### Sheet Structure

Each Excel file contains these sheets:

1. **Summary** - Account overview, opening/closing balance
2. **Opportunity to Earn** - Potential interest earnings
3. **Transactions** - All transactions with categorization
4. **EOD** - End of day balances
5. **Investment** - Investment transactions
6. **Creditors** - Money paid out
7. **Debtors** - Money received
8. **UPI-CR** - UPI credit transactions
9. **UPI-DR** - UPI debit transactions
10. **Cash Withdrawal** - ATM and cash withdrawals
11. **Cash Deposit** - Cash deposits
12. **Redemption, Dividend & Interest** - Investment returns
13. **Probable EMI** - Detected EMI payments
14. **Refund-Reversal** - Reversed transactions
15. **Suspense Credit** - Unclassified credits
16. **Suspense Debit** - Unclassified debits
17. **Payment & Receipt Voucher** - Voucher details

---

## Future Enhancements

### Planned Features

🔲 **Virtual Scrolling**
- Render only visible rows
- Handle 1000+ row datasets smoothly
- Improve performance

🔲 **Search & Filter**
- Search across all columns
- Column-specific filters
- Date range filters
- Amount range filters
- Multi-column sorting

🔲 **Cell Editing**
- Edit category/entity inline
- Save changes back to Excel
- Undo/redo support

🔲 **Custom Views**
- Save column widths
- Save filter preferences
- Create named views
- Share views with team

🔲 **Comparison Mode**
- Compare two statements side-by-side
- Highlight differences
- Month-over-month analysis

🔲 **Charts & Visualizations**
- Spending trends
- Category breakdown (pie chart)
- Cash flow timeline
- UPI vs Cash distribution

🔲 **Export Enhancements**
- Export filtered data only
- Export multiple sheets as ZIP
- Export as JSON
- Export with custom formatting

🔲 **Collaboration**
- Share statement view link
- Add comments on transactions
- Tag team members
- Approval workflows

🔲 **AI Features**
- Auto-categorization improvements
- Anomaly detection
- Spending predictions
- Custom insights

🔲 **Mobile App**
- Native iOS/Android apps
- Offline viewing
- Push notifications for completed jobs

---

## Development Guide

### Running Locally

**Backend:**
```bash
cd /path/to/CypherX
source .venv/bin/activate
uvicorn apps.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd /path/to/CypherX
npm run dev
# Opens at http://localhost:3000
```

### Testing the Feature

1. Navigate to: `http://localhost:3000/dashboard/statements`
2. Click "Upload Statement"
3. Use test PDF: `public/samples/axis.pdf`
4. Select Financial Year: "2022-2023" (matches the test PDF dates)
5. Click "Upload & Analyze"
6. Wait 5-10 seconds for processing
7. Click "View Data"
8. Explore the Excel-like table:
   - Resize columns by dragging borders
   - Switch between sheet tabs
   - Click "Fullscreen" for immersive view
   - Click "Export CSV" to download

### Environment Variables

```bash
# .env file
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional (for AI features)
CLAUDE_VERTEX_PROJECT_ID=your-project-id
```

### File Paths

- Job storage: `.cypherx/jobs/{job_id}/`
- Legacy system: `old_endpoints/backend/`
- Test PDFs: `public/samples/`

---

## Troubleshooting

### Common Issues

**Issue: "No statements analyzed yet" even after upload**

**Solution:**
- Check if the FastAPI backend from `apps/` is running (`curl http://localhost:8000/health/live`)
- Check if frontend API proxy is working (`curl http://localhost:3000/api/ai/statements`)
- Check browser console for errors
- Try hard refresh (Cmd+Shift+R)

**Issue: "Job failed" with date mismatch error**

**Solution:**
- Ensure Financial Year matches PDF content dates
- Example: PDF has transactions from Apr 2022 to Mar 2023 → Use "2022-2023"
- Check error message in job details

**Issue: OCR errors (Mistral auth)**

**Solution:**
- OCR is optional, extraction will proceed without it
- To enable: Run `gcloud auth application-default login`
- Or ignore - legacy extraction works fine without OCR

**Issue: Column resizing not working**

**Solution:**
- Ensure you're hovering over the right edge of column header
- Look for cursor change to resize icon (↔)
- Click and hold while dragging
- Check browser console for JavaScript errors

**Issue: Description text not wrapping**

**Solution:**
- Already implemented with `word-break: break-word`
- Try resizing the Description column wider/narrower
- If still not working, check for CSS conflicts

---

## Performance Considerations

### Backend Optimization

✅ **Lazy Loading** - Excel data fetched only when viewing detail page
✅ **Token-based Security** - Prevents unauthorized access
✅ **Efficient Storage** - Only stores Excel path, not full JSON in job result
✅ **Streaming** - Large Excel files streamed directly to client

### Frontend Optimization

✅ **React.useMemo** - Memoize column/row calculations
✅ **Conditional Rendering** - Only render visible components
✅ **Client-side Caching** - Avoid redundant API calls
✅ **Progressive Enhancement** - Base functionality works, enhancements add UX

### Known Limitations

⚠️ **Large Datasets** - Tables with 1000+ rows may slow down (virtual scrolling planned)
⚠️ **Mobile UX** - Desktop-optimized, mobile experience can be improved
⚠️ **Real-time Updates** - Uses polling (5s interval), not WebSockets
⚠️ **Multi-file Upload** - Currently single file only

---

## Credits

**Developed by:** CypherX Team
**Date:** September 2025
**Version:** 1.0.0

**Technologies Used:**
- Next.js, React, TypeScript
- FastAPI, Python, pandas
- Legacy CA_Statement_Analyzer system
- Tailwind CSS, Shadcn UI

---

## License

Internal company use only. All rights reserved.

---

**End of Documentation**

For questions or support, contact the development team or open an issue in the repository.