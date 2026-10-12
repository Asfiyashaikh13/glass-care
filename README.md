# Glass Care Estimates

This is a browser-based glass estimate calculator. Open `index.html` directly in a browser; no server or AI model is required.

Sqft uses exact dimensions without size rounding. Each item has an editable discount, defaulting to 10%, applied before GST: `area × rate × (1 − discount/100)`.

## Client link

GitHub Pages deploys the static calculator from `main` using the workflow in `.github/workflows/pages.yml`. The client URL is <https://asfiyaShaikh13.github.io/glass-care/>. If Pages has not been enabled yet, open repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**, then rerun the **Deploy Glass Care to GitHub Pages** workflow. Only the app HTML, CSS, JavaScript, and rate JSON are published; the source Excel workbook is not included in the Pages artifact.
