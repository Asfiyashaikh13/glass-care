# Architectural & Technical Assumptions: Glass Care Engine Revamp

## 1. Canonical Unit & Arithmetic Architecture
- **Canonical Dimension Unit (mm):** All size inputs (Length, Width, Height, Depth, Thickness) are converted to millimetres internally using exact conversion factors:
  - 1 inch = 25.4 mm
  - 1 cm = 10.0 mm
  - 1 foot = 304.8 mm
  - 1 mm = 1.0 mm
- **Storage of Dimensions:** Each line item preserves both:
  1. The user-entered numeric values and dimension unit (`enteredHeight`, `enteredWidth`, `enteredThickness`, `dimensionUnit`).
  2. The canonical millimetre values (`heightMm`, `widthMm`, `thicknessMm`) and billed sizes (`billedHeightMm`, `billedWidthMm`).
- **Precision & Rounding:**
  - Calculations are executed using `decimal.js` with `ROUND_HALF_UP` and high precision (28 decimal places).
  - Money is rounded half-up to 2 decimal places strictly at the end of each line calculation (gross, discount, taxable, GST components, line total) to prevent float-point rounding drift.
  - Grand total payable is rounded to the nearest integer rupee with a dedicated `Round Off` line (`roundOff = payable - unroundedTotal`).

## 2. Dynamic UI Labels & Converted Previews
- The dimension unit selector (`id="dimensionUnit"`) controls the active input unit across all size fields (`mm`, `in`, `cm`, `ft`).
- Input labels dynamically reflect the active unit (e.g., `Length (in)`, `Width (mm)`, `Depth (in)`).
- Table headers in the Current Estimate table dynamically display the current active dimension unit.
- Real-time conversion previews appear beneath the height, width, and thickness fields (e.g., `1800 mm = 70.87 in` or `72 in = 1828.8 mm`).

## 3. Product Pricing Basis & Rate Book
- Products in the Rate Book are tied to a pricing basis:
  - `Sq Ft`
  - `Running Ft`
  - `Cubic Ft`
  - `Per Piece`
- Along with `rate`, `gstRate`, and optional `hsn`.
- When a product is selected in the Add Item form, its basis and default rate auto-fill.
- If the user overrides the basis, an `(overridden)` tag is displayed.
- The selected basis is stored on the item so existing documents never alter their pricing logic.

## 4. Formulas (Calculated from mm)
- **Sq Ft:** `(Height_mm / 304.8) × (Width_mm / 304.8) × Qty`
- **Running Ft:** `((Height_mm / 304.8) + (Width_mm / 304.8)) × 2 × Qty`
- **Cubic Ft:** `(Length_mm × Width_mm × Depth_mm) / 28,316,846.592 × Qty` (identical to `in³ / 1728`)
- **Per Piece:** `Qty`
- **Tax Breakdown:**
  - Karnataka: `CGST = taxable × (rate / 2)%`, `SGST = taxable × (rate / 2)%` (each rounded half-up to 2 decimals).
  - Interstate: `IGST = taxable × rate%`.
- **Optional 3-Inch Step Rounding:**
  - Rounded size: `ceil(size_mm / 76.2) * 76.2`.
  - Configurable globally in Settings and toggled per line item. Shown explicitly on the line and in PDF output when applied.

## 5. Sanity Checks & Safety Warnings
- A non-blocking yellow warning banner is triggered whenever:
  - Any dimension exceeds 6,000 mm.
  - Glass depth/thickness exceeds 100 mm.
  - Any depth/thickness exceeds 300 mm.
  - Any dimension is below 3 mm.
  - Quantity exceeds 500.
  - Discount exceeds 50%.
  - Rate is greater than 5× or less than 0.2× the Rate Book default rate.
  - Dimension unit mix-up is detected (e.g., unit is `in` and dimension > 500, or unit is `mm` and all dimensions < 20).
- Users must check `"I confirm these values are correct"` before the item can be added to the estimate.

## 6. Document Preservation & Migration
- Old saved documents retain frozen totals in `record.totals`.
- A one-time migration (`migrateSavedDocuments`) guarantees every document in localStorage has a frozen `totals` snapshot.
- Totals are never altered automatically when opening, viewing, or printing old documents.
- A `"Recalculate Totals"` option is available in the saved document menu if the user explicitly chooses to recalculate.
- A `"Backup Data (JSON)"` button allows downloading all browser data (estimates, rate book, documents, settings) as a timestamped JSON file.

## 7. Dynamic Category & Item Name Dropdown Persistence
- **Custom Additions to Dropdowns:** When a user picks `＋ Type new category...` or `＋ Type new item...` and types a new name, confirming (via Enter, field blur/change, adding item to estimate, or saving rate) automatically registers that custom entry into the `<select>` options.
- **Permanent Local Storage:** Added custom categories are saved to `glassCareCustomCategories` and custom items to `glassCareCustomItemNames`. On every page load or form reset, they are restored and injected before the `__custom__` option so the dropdown master list grows permanently with the user's business.

## 8. GSTIN Verification & Registration Database Auto-Fill Architecture
- **Official Mod-36 Luhn Checksum:** Every 15-character Indian GSTIN is strictly validated against the official GSTN Mod-36 checksum algorithm before any lookup:
  - First 2 digits: State code (e.g., 29 for Karnataka, 27 for Maharashtra).
  - Characters 3–12: 10-character alphanumeric PAN.
  - Character 13: Entity number (`[1-9A-Z]`).
  - Character 14: Default `Z`.
  - Character 15: Official Mod-36 checksum digit calculated across positions 0–13 with alternating weights (1, 2) modulo 36.
  - If the checksum fails, the user is immediately alerted and no unnecessary network requests are made.
- **No Synthetic Fake Names:** Synthetic fallbacks (like `Proprietorship (PAN)` or `Karnataka Business Location`) and static company tables are eliminated. The system verifies actual records from the official database or user's historical saved documents.
- **Provider & Backend Proxy Integration:**
  - Supports configurable Backend Proxy URL (recommended for production to keep API keys secure on the server).
  - Supports direct API providers (Appyflow, GSTINCheck, GSTINAPI) with client credentials stored securely in browser settings.
  - Implements 400ms input debounce and in-flight request cancellation (`AbortController`) to avoid duplicate queries while typing.
- **Standardized Field Mapping:**
  - Extracts and separates Legal Business Name (`legalName`) and Trade Name (`tradeName`).
  - Formats principal place of business into Door/Flat/Locality (`flatNo`) and Building/Street/District/PIN (`buildingName`).
  - Detects and reports operational registration statuses: `Active`, `Cancelled` (with cancellation date), and `Suspended`.
  - Automatically updates the state dropdown (`customerState`) and recalibrates CGST/SGST vs IGST split.



