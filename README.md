# Glass Care Enterprises Document System

Browser-based estimate, bill, and invoice generator for Glass Care Enterprises. The app uses Supabase Auth and Postgres for shared document records, settings, and sequential document numbers. The draft estimate and rate book remain local to the browser.

## Features

- Preserve the existing category, product, and rate-book data; factory/vendor details are no longer shown on customer documents.
- Shared line and tax calculations for Sqft, R.ft, Cubic Ft, Pcs, and Job. Cubic feet requires length, width, and thickness/depth.
- Per-line discount and configurable GST; tax summaries preserve each GST rate, with Karnataka using CGST + SGST and other states using IGST.
- Whole-rupee payable rounding with a separate Round Off line.
- Row-level Edit/Save/Cancel, including dimensions, measure, taxable amount, and tax amount. Edits recalculate the financial summary.
- Generate estimate and bill PDFs; convert a saved estimate/bill into an invoice without overwriting its source.
- Default editable terms and conditions plus a separate calculation notes PDF.
- Supabase email/password sign-in, per-user row-level security, and cloud-synced generated documents/settings.
- Company logo at assets/glass-care-logo.jpeg.

## Use

Open `index.html` in a modern browser. Enter customer details and line items, then choose Generate Estimate PDF or Generate Bill PDF. Use Saved documents → Convert to Invoice to create an invoice from a saved source. The document opens in the browser print dialog; choose “Save as PDF.” When calculation notes are enabled, the same print window changes to the notes document after the first print dialog closes.

Generated documents and document settings are stored in Supabase and are shared across devices for the same signed-in user. The current unsaved estimate draft and rate book remain in local browser storage. Do not clear site storage before confirming saved documents have synced.

## Supabase setup

1. Review `supabase-config.js`; it contains the project URL and browser-safe publishable key. Never place a Supabase secret/service-role key in this static app.
2. In the Supabase Dashboard, open **SQL Editor**, run `supabase/schema.sql` once, and verify there are no errors.
3. In **Authentication → Settings**, disable public sign-ups. Then use **Authentication → Users** to create the single permitted user (or invite them). Public user registration is not implemented in the app.
4. Configure the Auth site URL and redirect URLs for the local app and production site. Email/password sign-in is enabled by default; configure SMTP if you need reliable email delivery.
5. Deploy the updated static app over HTTPS. Sign in to migrate any existing locally saved documents into that user's account.

Review the project's Security Advisor and test sign-in, RLS, document creation, and cross-device access before entering real customer data. The Supabase Free project can pause after inactivity and does not include automatic database backups; export important records regularly.

## Tests

`node --test tests/calculations.test.js` covers rupee rounding, square/cubic conversions, GST jurisdiction and rate breakdowns, discount order, and dependent totals. `tests/browser-tests.html` provides the same calculation checks in a browser.
Alternatively, open `tests/browser-tests.html` in a browser for the same calculation checks without installing Node.js.

## Client link

GitHub Pages deploys the static app from `main` using `.github/workflows/pages.yml`: <https://asfiyashaikh13.github.io/glass-care/>. The workflow publishes HTML, JavaScript, CSS, rate JSON, and the `assets/` logo; the source Excel workbook is not published.
