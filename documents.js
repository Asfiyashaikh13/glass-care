(() => {
  "use strict";

  const STORAGE = {
    settings: "glassCareDocumentSettings",
    documents: "glassCareDocuments"
  };

  const COMPANY = {
    name: "Glass Care Enterprises",
    tagline: "FRAME YOUR VISION",
    addressLines: [
      "No. 122/1 Kogilu Main Road,",
      "Bellahalli Cross Yelahanka, Bengaluru Urban,",
      "Bengaluru Karnataka 560064",
      "India"
    ],
    gstin: "29BNYPN6916L1ZU",
    phone: "91-9945988852",
    email: "glasscare.enter55@gmail.com",
    signatory: "Khursheed"
  };

  const STATE_CODES = {
    "Jammu and Kashmir": "01",
    "Himachal Pradesh": "02",
    "Punjab": "03",
    "Chandigarh": "04",
    "Uttarakhand": "05",
    "Haryana": "06",
    "Delhi": "07",
    "Rajasthan": "08",
    "Uttar Pradesh": "09",
    "Bihar": "10",
    "Sikkim": "11",
    "Arunachal Pradesh": "12",
    "Nagaland": "13",
    "Manipur": "14",
    "Mizoram": "15",
    "Tripura": "16",
    "Meghalaya": "17",
    "Assam": "18",
    "West Bengal": "19",
    "Jharkhand": "20",
    "Odisha": "21",
    "Chhattisgarh": "22",
    "Madhya Pradesh": "23",
    "Gujarat": "24",
    "Dadra and Nagar Haveli and Daman and Diu": "26",
    "Maharashtra": "27",
    "Andhra Pradesh": "37",
    "Karnataka": "29",
    "Goa": "30",
    "Lakshadweep": "31",
    "Kerala": "32",
    "Tamil Nadu": "33",
    "Puducherry": "34",
    "Andaman and Nicobar Islands": "35",
    "Telangana": "36",
    "Ladakh": "38"
  };

  const DEFAULT_TERMS = [
    "Order once confirmed will not be taken back or exchanged.",
    "Any complaint related to processing quality should be informed at time of unloading duly remarked on DC.",
    "All disputes shall be subject to Bangalore jurisdiction only.",
    "Initial payment 70% of gross price to be paid at the time of ordering.",
    "Interim payment 20% of gross price on delivery pallot glass & material of the goods to be used for the work.",
    "Final payment 10% of gross price of completion of works."
  ];

  const settings = readJson(STORAGE.settings, { terms: DEFAULT_TERMS.join("\n") });
  const documents = readJson(STORAGE.documents, []);
  const settingsPanel = document.getElementById("documentSettings");
  const termsText = document.getElementById("termsText");
  const termsToggle = document.getElementById("includeTerms");
  const notesToggle = document.getElementById("generateNotes");
  const documentsList = document.getElementById("savedDocumentsList");
  const status = document.getElementById("documentStatus");

  // Modal elements
  const pdfModal = document.getElementById("pdfModal");
  const pdfModalBackdrop = document.getElementById("pdfModalBackdrop");
  const pdfPreviewFrame = document.getElementById("pdfPreviewFrame");
  const pdfModalTitle = document.getElementById("pdfModalTitle");
  const modalPrintBtn = document.getElementById("modalPrintBtn");
  const modalNewTabBtn = document.getElementById("modalNewTabBtn");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  let currentBlobUrl = null;
  let currentRecord = null;
  let currentIsNotes = false;
  let currentHtml = "";

  if (termsText) {
    termsText.value = settings.terms || DEFAULT_TERMS.join("\n");
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  let statusTimeout = null;

  function showStatus(message, isError = false) {
    if (!status) return;
    if (statusTimeout) {
      clearTimeout(statusTimeout);
      statusTimeout = null;
    }
    status.classList.remove("fade-out");
    status.textContent = message;
    status.classList.toggle("error", isError);

    if (!isError && message.includes("is ready")) {
      statusTimeout = setTimeout(() => {
        status.classList.add("fade-out");
      }, 5000);
    }
  }

  function dateLabel(isoDate) {
    if (!isoDate) return "";
    const parts = String(isoDate).split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return escapeHtml(isoDate);
  }

  function format(value, decimals = 2) {
    return GlassCareCalculations.formatMoney(value, decimals);
  }

  function formatRawNumber(value, decimals = 2) {
    const num = Number(value) || 0;
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function defaultHsn(item) {
    if (item.hsn) return item.hsn;
    const desc = `${item.category || ""} ${item.itemName || ""}`.toLowerCase();
    if (desc.includes("alum") || desc.includes("profile") || desc.includes("shutter") || desc.includes("stud")) {
      return "761010";
    }
    return "700719";
  }

  function collectDetails() {
    const itemsList = (window.GlassCareEstimate && window.GlassCareEstimate.items) ||
      (typeof estimateItems !== "undefined" ? estimateItems : []);
    return {
      customerName: (document.getElementById("customerName")?.value || "").trim(),
      flatNo: (document.getElementById("flatNo")?.value || "").trim(),
      buildingName: (document.getElementById("buildingName")?.value || "").trim(),
      customerPhone: (document.getElementById("customerPhone")?.value || "").trim(),
      customerGstin: (document.getElementById("customerGstin")?.value || "").trim(),
      paymentMode: document.getElementById("paymentMode")?.value || "Paid",
      date: document.getElementById("estimateDate")?.value || new Date().toISOString().slice(0, 10),
      state: document.getElementById("customerState")?.value || "Karnataka",
      items: itemsList.map(item => ({
        id: item.id,
        category: item.category,
        itemName: item.itemName,
        hsn: defaultHsn(item),
        unit: item.unit,
        height: Number(item.height) || 0,
        width: Number(item.width) || 0,
        thickness: Number(item.thickness) || 0,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        gstRate: Number(item.gstRate ?? 18),
        ...(item.measureOverride != null ? { measureOverride: Number(item.measureOverride) } : {}),
        ...(item.taxableAmountOverride != null ? { taxableAmountOverride: Number(item.taxableAmountOverride) } : {}),
        ...(item.taxAmountOverride != null ? { taxAmountOverride: Number(item.taxAmountOverride) } : {})
      }))
    };
  }

  function validate(data) {
    if (!data.items.length) return "Add at least one item before generating a document.";
    for (const [index, item] of data.items.entries()) {
      if (!item.category && !item.itemName) return `Add a description for item ${index + 1}.`;
      const result = GlassCareCalculations.calculateLine(item);
      if (result.errors.length) return `Item ${index + 1}: ${result.errors[0]}`;
    }
    if (!data.customerName) return "Enter the customer name before generating a document.";
    if (!data.date || !data.state) return "Choose a document date and state.";
    return "";
  }

  function nextLocalNumber(type) {
    const countersKey = "glassCareDocumentCounters";
    let counters = readJson(countersKey, {});
    const countType = type;
    if (!counters[countType]) {
      const sequence = countType === "Calculation" ? "calculationNumber" : "number";
      counters[countType] = documents.reduce((maximum, record) => {
        const value = String(record[sequence] || record.number || "");
        let pattern;
        if (countType === "Bill") pattern = /GCE-Bill-(\d+)$/i;
        else if (countType === "Invoice") pattern = /GCE-(?:Inv|Invoice)-(\d+)$/i;
        else if (countType === "Estimate") pattern = /GCE-Est(?:imate)?-(\d+)$/i;
        else pattern = /GCE-(?:Calc|Calculation)-(\d+)$/i;
        const match = value.match(pattern) || value.match(/-(\d+)$/);
        return match && (countType === "Calculation" || record.type === countType)
          ? Math.max(maximum, Number(match[1]))
          : maximum;
      }, 0);
    }
    counters[countType] += 1;
    localStorage.setItem(countersKey, JSON.stringify(counters));
    const prefix = countType === "Invoice" ? "GCE-Invoice" : (countType === "Bill" ? "GCE-Bill" : (countType === "Estimate" ? "GCE-Estimate" : "GCE-Calculation"));
    return `${prefix}-${String(counters[countType]).padStart(3, "0")}`;
  }

  async function createRecord(type, data, sourceId = null) {
    const error = validate(data);
    if (error) {
      showStatus(error, true);
      alert(error);
      return null;
    }
    const totals = GlassCareCalculations.calculateTotals(data.items, data.state);
    let number;
    let calculationNumber = null;

    // Resilient number reservation: try Supabase first if signed in, fallback seamlessly to local
    try {
      if (window.GlassCareStore?.user && window.GlassCareStore?.nextNumber) {
        number = await GlassCareStore.nextNumber(type);
        if (notesToggle?.checked) calculationNumber = await GlassCareStore.nextNumber("Calculation");
      } else {
        number = nextLocalNumber(type);
        if (notesToggle?.checked) calculationNumber = nextLocalNumber("Calculation");
      }
    } catch (e) {
      console.warn("Could not reserve Supabase sequential number, using local:", e);
      number = nextLocalNumber(type);
      if (notesToggle?.checked) calculationNumber = nextLocalNumber("Calculation");
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      number,
      calculationNumber,
      sourceId,
      sourceNumber: sourceId ? documents.find(doc => doc.id === sourceId)?.number || "" : "",
      date: data.date,
      state: data.state,
      customer: {
        name: data.customerName,
        location: data.flatNo,
        project: data.buildingName,
        phone: data.customerPhone,
        gstin: data.customerGstin || ""
      },
      paymentMode: data.paymentMode || "Paid",
      items: data.items,
      totals,
      termsIncluded: type !== "Estimate" && (termsToggle?.checked ?? true),
      terms: (termsToggle?.checked ?? true) ? (termsText?.value || DEFAULT_TERMS.join("\n")).split("\n").map(term => term.trim()).filter(Boolean) : [],
      notesEnabled: notesToggle?.checked ?? false,
      createdAt: new Date().toISOString()
    };

    documents.unshift(record);

    // Save with resilient fallback
    try {
      if (window.GlassCareStore?.user && window.GlassCareStore?.saveDocument) {
        await GlassCareStore.saveDocument(record);
      } else {
        localStorage.setItem(STORAGE.documents, JSON.stringify(documents));
      }
    } catch (e) {
      console.warn("Cloud save failed, saved locally:", e);
      localStorage.setItem(STORAGE.documents, JSON.stringify(documents));
    }

    if (window.GlassCareDirectory?.save && data.customerGstin) {
      window.GlassCareDirectory.save(data.customerGstin, {
        name: data.customerName,
        flatNo: data.flatNo,
        buildingName: data.buildingName,
        customerPhone: data.customerPhone,
        state: data.state
      });
    }

    renderDocuments();
    return record;
  }

  function dimensionText(item) {
    if (item.unit === "Pcs" || item.unit === "Job") return "—";
    const dims = [item.height, item.width];
    if (item.unit === "Cubic Ft") dims.push(item.thickness);
    return `${dims.map(value => Math.round(value)).join(" × ")} mm`;
  }

  function amountWords(value) {
    const words = numberToWords(value);
    return words.replace(/^Rupees\s*/i, "").trim();
  }

  function documentHtml(record, isNotes = false, autoPrint = false) {
    const isKarnataka = record.state === "Karnataka";
    const stateCode = STATE_CODES[record.state] || "";
    const placeOfSupply = `${escapeHtml(record.state)}${stateCode ? ` (${stateCode})` : ""}`;
    const totals = (record.totals && Array.isArray(record.totals.lines) && record.totals.lines.length)
      ? record.totals
      : GlassCareCalculations.calculateTotals(record.items, record.state);
    const customer = record.customer || {};

    let docTitle = "TAX INVOICE";
    if (isNotes) docTitle = "CALCULATION NOTES";
    else if (record.type === "Estimate") docTitle = "ESTIMATE";
    else if (record.type === "Bill") docTitle = "BILL";
    else docTitle = "TAX INVOICE";

    const titleText = `${docTitle} - ${record.number}`;
    const logoUrl = "data:image/jpeg;base64,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NTA9yo3pWta1qtVU3RjduvdHXLBo0l3kt9aayjaGA6bupbg8Qc6ke9bVRbmVlMKepcXH+Lgc8xjQFUaxvj/1QxKhhx/Wbh3yL7u06dFJVUkMtL7pcnUirBJH71V8atcqKvYiJ1GByTE+ITjzzGyyZRhFXp1ppZZllalajmzyo7bnexHta6aVzU5WuRiRsRV61Xfm6BgkG7QU1K8z0NK2OXX0t5zgM8S1p0B5ccLUdaJp2iKqnL4+WAM45kaleKyWa3Y7ZaDH7PTNp6C2UsVHSwt7I4Y2IxjU+JrUQHtBWSS45PFTYAaMBAAeL1AAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEQABEAARAAEX4D9ARAAEQABEAARAAEQABEAARAAEQFMtTqPKcs4ibphlkyKooX11VFFCrqmRsUa+5mOXdG9idS9ieM2L9a3rD/KTR/7bVf4ShM2wrqmaaKjoHSNje5hIeBq09Y966G/YqgpYIJa64tidKxrw0sJ0cM8QfcrVg1fTLGbth2DWvG77cWV9dRNkbNUMe56PV0r3J1uRFXZHInX5CtXEQ/ILlrpR4zaL3U0a3KOhpY+WoeyNr5XcqOVG+LdU32QmL1tA+zW6OukhJc8tG5kAguGcZwRodFC2PZtl8uctBHOAxgcd/BIIacZxkHUaq3oKk3fh911xW2VN9tWfLUyUcTpnQ0dyqY53tam68m6Iirtv1bp5t16iTeGXVa66hY7W2jJKh1TdbK5iLUuROaeB+/IrvK5Fa5FXxpyr1ruprW7al9RXMt1fTOgkeCW5IIdjiAR041/QztXPZKOmt77lb6plRGwgP3QQW50BIPRnT9HE0gFc+L7I7nSxYvjVmraiGorJ5qh6QSqxztkaxiboqdqvd9BL327MsdBJXPbvbuNOGSSAB+Khdn7O+/3GO3sd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";

    // Items table rows
    const itemsTableRows = totals.lines.map((line, index) => {
      const descriptionTitle = [line.category, line.itemName].filter(Boolean).join(" — ");
      const dims = dimensionText(line);
      const hsn = defaultHsn(line);

      let dimsBlock = "";
      if (line.unit !== "Pcs" && line.unit !== "Job") {
        dimsBlock = `<div class="item-dims">Size in mm - ${escapeHtml(dims)}${line.quantity > 1 ? ` × ${line.quantity} nos` : ""}</div>`;
      }
      let measureNote = `<div class="item-measure">Measure: ${escapeHtml(line.measureLabel)}</div>`;
      if (line.discountPercent > 0) {
        measureNote += `<div class="item-discount-note">Gross: ₹${formatRawNumber(line.grossAmount)} (${line.discountPercent}% off)</div>`;
      }

      if (isKarnataka) {
        const halfRate = (line.gstRate / 2).toFixed(1).replace(/\.0$/, "");
        const halfTax = formatRawNumber(line.taxAmount / 2);
        return `<tr>
          <td class="text-center">${index + 1}</td>
          <td class="item-desc-cell">
            <div class="item-title">${escapeHtml(descriptionTitle)}</div>
            ${dimsBlock}
            ${measureNote}
          </td>
          <td class="text-center hsn-cell">${escapeHtml(hsn)}</td>
          <td class="text-right qty-cell">${formatRawNumber(line.quantity, line.unit === "Pcs" ? 0 : 2)} <span class="unit-label">${escapeHtml(line.unit)}</span></td>
          <td class="text-right">${formatRawNumber(line.rate, 2)}</td>
          <td class="text-center">${halfRate}%</td>
          <td class="text-right">${halfTax}</td>
          <td class="text-center">${halfRate}%</td>
          <td class="text-right">${halfTax}</td>
          <td class="text-right text-bold">${formatRawNumber(line.taxableAmount, 2)}</td>
        </tr>`;
      } else {
        const igstRate = line.gstRate.toFixed(1).replace(/\.0$/, "");
        const igstTax = formatRawNumber(line.taxAmount);
        return `<tr>
          <td class="text-center">${index + 1}</td>
          <td class="item-desc-cell">
            <div class="item-title">${escapeHtml(descriptionTitle)}</div>
            ${dimsBlock}
            ${measureNote}
          </td>
          <td class="text-center hsn-cell">${escapeHtml(hsn)}</td>
          <td class="text-right qty-cell">${formatRawNumber(line.quantity, line.unit === "Pcs" ? 0 : 2)} <span class="unit-label">${escapeHtml(line.unit)}</span></td>
          <td class="text-right">${formatRawNumber(line.rate, 2)}</td>
          <td class="text-center">${igstRate}%</td>
          <td class="text-right">${igstTax}</td>
          <td class="text-right text-bold">${formatRawNumber(line.taxableAmount, 2)}</td>
        </tr>`;
      }
    }).join("");

    // Bill items table rows (streamlined, customer-friendly format)
    const billTableRows = totals.lines.map((line, index) => {
      const descriptionTitle = [line.category, line.itemName].filter(Boolean).join(" — ");
      const dims = dimensionText(line);
      let measureNote = `<div class="item-measure">Measure: ${escapeHtml(line.measureLabel)}</div>`;
      if (line.discountPercent > 0) {
        measureNote += `<div class="item-discount-note">Gross: ₹${formatRawNumber(line.grossAmount)} (${line.discountPercent}% off)</div>`;
      }
      return `<tr>
        <td class="text-center">${index + 1}</td>
        <td class="item-desc-cell">
          <div class="item-title">${escapeHtml(descriptionTitle)}</div>
          ${measureNote}
        </td>
        <td class="text-center">${escapeHtml(dims)}</td>
        <td class="text-right qty-cell">${formatRawNumber(line.quantity, line.unit === "Pcs" ? 0 : 2)} <span class="unit-label">${escapeHtml(line.unit)}</span></td>
        <td class="text-right">₹${formatRawNumber(line.rate, 2)}</td>
        <td class="text-right text-bold">₹${formatRawNumber(line.taxableAmount, 2)}</td>
      </tr>`;
    }).join("");

    // Tax breakdown rows for totals
    const taxSummaryRows = totals.taxBreakdown.map(group => {
      const rateFormatted = group.rate.toFixed(1).replace(/\.0$/, "");
      if (isKarnataka) {
        const halfRate = (group.rate / 2).toFixed(1).replace(/\.0$/, "");
        const halfAmt = formatRawNumber(group.taxAmount / 2);
        return `
          <tr>
            <td class="text-left">CGST (${halfRate}%)</td>
            <td class="text-right">${halfAmt}</td>
          </tr>
          <tr>
            <td class="text-left">SGST (${halfRate}%)</td>
            <td class="text-right">${halfAmt}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td class="text-left">IGST (${rateFormatted}%)</td>
          <td class="text-right">${formatRawNumber(group.taxAmount)}</td>
        </tr>
      `;
    }).join("");

    // Terms list markup
    const termsMarkup = record.termsIncluded && record.terms?.length ? `
      <div class="terms-section">
        <div class="terms-title">Terms &amp; Conditions:</div>
        <ol class="terms-list">
          ${record.terms.map(t => `<li>${escapeHtml(t)}</li>`).join("")}
        </ol>
      </div>
    ` : "";

    // Calculation Notes Section (if viewed as calculation notes)
    const notesBreakdown = isNotes ? `
      <section class="notes-breakdown">
        <h2 class="section-title">Item Calculation Details</h2>
        ${record.items.map((item, idx) => {
          const line = GlassCareCalculations.calculateLine(item);
          const taxLabel = isKarnataka
            ? `CGST ${(line.gstRate / 2).toFixed(1)}% (₹${formatRawNumber(line.taxAmount / 2)}) + SGST ${(line.gstRate / 2).toFixed(1)}% (₹${formatRawNumber(line.taxAmount / 2)})`
            : `IGST ${line.gstRate}% (₹${formatRawNumber(line.taxAmount)})`;
          return `
            <div class="note-item">
              <div class="note-item-header">${idx + 1}. ${escapeHtml([item.category, item.itemName].filter(Boolean).join(" — "))}</div>
              <div class="note-row"><b>Dimensions:</b> ${escapeHtml(dimensionText(item))} &nbsp;·&nbsp; <b>Unit:</b> ${escapeHtml(item.unit)} &nbsp;·&nbsp; <b>Qty:</b> ${item.quantity} &nbsp;·&nbsp; <b>Measure:</b> ${escapeHtml(line.measureLabel)}</div>
              <div class="note-row"><b>Formula:</b> ${escapeHtml(line.formula)} = ₹${formatRawNumber(line.grossAmount)}; Discount: ${line.discountPercent}% = −₹${formatRawNumber(line.discountAmount)}; Taxable: ₹${formatRawNumber(line.taxableAmount)}</div>
              <div class="note-row"><b>Taxes:</b> ${taxLabel} &nbsp;·&nbsp; <b>Line Total:</b> ₹${formatRawNumber(line.taxableAmount + line.taxAmount)}</div>
            </div>
          `;
        }).join("")}
        <div class="note-summary">
          <div class="note-summary-title">Summary Audit</div>
          <div>Gross subtotal: ₹${formatRawNumber(record.totals.grossSubtotal)} − Discount: ₹${formatRawNumber(record.totals.discountTotal)} = Taxable: ₹${formatRawNumber(record.totals.subtotal)}. Total Tax: ₹${formatRawNumber(record.totals.taxTotal)}. Unrounded: ₹${formatRawNumber(record.totals.unroundedTotal)} + Round Off: ₹${formatRawNumber(record.totals.roundOff)} = Payable: ₹${formatRawNumber(record.totals.payable, 0)}.</div>
          <div class="note-ref">Calculation note for ${escapeHtml(record.type)} #${escapeHtml(record.number)}</div>
        </div>
      </section>
    ` : "";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titleText)}</title>
  <style>
    @page {
      size: portrait;
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      line-height: 1.4;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #10203a;
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .print-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 10pt;
      font-weight: 600;
    }
    .print-btn-primary {
      background: #ef7625;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      padding: 8px 18px;
      font-weight: bold;
      font-size: 10pt;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .print-btn-primary:hover { background: #d96215; }
    .page-container {
      max-width: 840px;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
    }
    /* Header layout matching reference invoice */
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #084a9b;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .brand-section {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      max-width: 58%;
    }
    .brand-logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .company-details {
      display: flex;
      flex-direction: column;
    }
    .company-name {
      font-size: 17pt;
      font-weight: 900;
      color: #084a9b;
      margin: 0 0 2px;
      line-height: 1.15;
      letter-spacing: 0.5px;
    }
    .company-tagline {
      font-size: 8.5pt;
      font-weight: 700;
      color: #ef7625;
      letter-spacing: 2px;
      margin: 0 0 5px;
    }
    .company-address {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.35;
    }
    .company-gstin {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }
    .doc-meta-section {
      text-align: right;
      min-width: 38%;
    }
    .doc-main-title {
      font-size: 22pt;
      font-weight: 900;
      color: #084a9b;
      letter-spacing: 1.5px;
      margin: 0 0 8px;
      line-height: 1;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .meta-table td {
      padding: 2.5px 0;
      vertical-align: top;
    }
    .meta-table td:first-child {
      font-weight: 700;
      color: #475569;
      text-align: right;
      padding-right: 10px;
      white-space: nowrap;
    }
    .meta-table td:last-child {
      text-align: left;
      font-weight: 700;
      color: #0f172a;
    }

    /* Customer details box */
    .bill-to-box {
      border: 1px solid #cbd5e1;
      border-left: 5px solid #ef7625;
      background: #f8fafc;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 9.5pt;
      border-radius: 6px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
    }
    .bill-to-header {
      grid-column: 1 / -1;
      font-size: 8.5pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .customer-name {
      font-size: 12pt;
      font-weight: 800;
      color: #084a9b;
      grid-column: 1 / -1;
    }
    .customer-info-line {
      color: #334155;
      font-size: 9.5pt;
    }
    .customer-gstin-highlight {
      font-weight: 700;
      color: #0f172a;
      grid-column: 1 / -1;
      margin-top: 3px;
      font-size: 9.5pt;
    }

    /* Main Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      table-layout: auto;
    }
    .items-table th {
      background: #10203a;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 700;
      border: 1px solid #10203a;
      padding: 7px 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 9.5pt;
      vertical-align: top;
      color: #0f172a;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .item-desc-cell {
      min-width: 190px;
    }
    .item-title {
      font-size: 10pt;
      font-weight: 700;
      color: #084a9b;
      margin-bottom: 2px;
      line-height: 1.25;
    }
    .item-dims {
      color: #334155;
      font-size: 8.5pt;
      font-weight: 600;
      margin-top: 2px;
    }
    .item-measure {
      color: #475569;
      font-size: 8.5pt;
    }
    .item-discount-note {
      color: #b45309;
      font-size: 8.5pt;
      font-weight: 600;
      margin-top: 1px;
    }
    .unit-label {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
    }

    /* Bottom section */
    .bottom-layout {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 8px;
    }
    .bottom-left {
      flex: 1.15;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bottom-right {
      flex: 0.85;
      min-width: 270px;
    }
    .amount-words-card {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .amount-words-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .amount-words-text {
      font-size: 10pt;
      font-weight: 700;
      font-style: italic;
      color: #084a9b;
      line-height: 1.3;
    }
    .terms-section {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .terms-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #084a9b;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .terms-list {
      margin: 0;
      padding-left: 18px;
      font-size: 8pt;
      color: #334155;
      line-height: 1.4;
    }
    .terms-list li {
      margin-bottom: 3px;
    }
    .signature-block {
      margin-top: 10px;
      text-align: right;
      padding-right: 12px;
    }
    .sig-thanks {
      font-style: italic;
      color: #64748b;
      font-size: 9pt;
      margin-bottom: 16px;
    }
    .sig-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 10.5pt;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      display: inline-block;
      padding-top: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      color: #475569;
      min-width: 160px;
      text-align: center;
      margin-top: 4px;
    }

    /* Summary Totals Table */
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .totals-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
    }
    .totals-table tr td:first-child {
      color: #334155;
      font-weight: 600;
    }
    .totals-table tr td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: #0f172a;
    }
    .grand-total-row td {
      background: #f1f5f9 !important;
      font-size: 12pt !important;
      font-weight: 900 !important;
      color: #084a9b !important;
      border-top: 2.5px solid #ef7625 !important;
      border-bottom: 2.5px solid #ef7625 !important;
      padding: 7px 8px !important;
    }
    .balance-due-row td {
      font-weight: 800 !important;
      color: #0f172a !important;
    }

    /* Calculation Notes Styling */
    .notes-breakdown {
      margin-top: 16px;
      border-top: 2.5px solid #084a9b;
      padding-top: 12px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #084a9b;
      margin: 0 0 10px;
    }
    .note-item {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .note-item-header {
      font-weight: 800;
      color: #084a9b;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .note-row {
      font-size: 9pt;
      color: #334155;
      margin-bottom: 3px;
      line-height: 1.35;
    }
    .note-summary {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 10px;
      font-size: 9pt;
      line-height: 1.4;
    }
    .note-summary-title {
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 4px;
    }
    .note-ref {
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 6px;
    }

    /* Distinct Bill Theme */
    body.is-bill .header-layout {
      border-bottom: 3px solid #0d5c3a;
    }
    body.is-bill .company-name {
      color: #0d5c3a;
    }
    body.is-bill .doc-main-title {
      color: #0d5c3a;
    }
    body.is-bill .bill-to-box {
      border-left: 5px solid #0d5c3a;
      background: #f0fdf4;
    }
    body.is-bill .customer-name {
      color: #0d5c3a;
    }
    body.is-bill .items-table th {
      background: #0d5c3a;
      border: 1px solid #0d5c3a;
    }
    body.is-bill .amount-words-text {
      color: #0d5c3a;
    }
    body.is-bill .terms-title {
      color: #0d5c3a;
    }
    body.is-bill .grand-total-row td {
      color: #0d5c3a !important;
      border-top: 2.5px solid #0d5c3a !important;
      border-bottom: 2.5px solid #0d5c3a !important;
      background: #f0fdf4 !important;
    }

    /* Utility classes */
    .text-center { text-align: center; }
    .text-right { text-align: right; font-variant-numeric: tabular-nums; }
    .text-left { text-align: left; }
    .text-bold { font-weight: 700; }

    @media print {
      @page {
        size: portrait;
        size: A4 portrait;
        margin: 8mm 10mm;
      }
      .no-print, .print-bar { display: none !important; }
      body { margin: 0; padding: 0; background: #ffffff; width: 100%; }
      .page-container { width: 100%; max-width: none; padding: 0; margin: 0; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .bottom-layout { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body class="${record.type === 'Bill' ? 'is-bill' : (record.type === 'Invoice' ? 'is-invoice' : '')}">
  <div class="print-bar no-print">
    <div class="print-bar-left">
      <span><strong>${escapeHtml(docTitle)}:</strong> ${escapeHtml(record.number)}</span>
      <span>•</span>
      <span>${dateLabel(record.date)}</span>
      <span>•</span>
      <span>Total: ₹${formatRawNumber(totals.payable, 0)}</span>
    </div>
    <div>
      <button type="button" class="print-btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>

  <div class="page-container">
    <header class="header-layout">
      <div class="brand-section">
        <img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Glass Care Enterprises Logo">
        <div class="company-details">
          <h1 class="company-name">${escapeHtml(COMPANY.name)}</h1>
          <div class="company-tagline">${escapeHtml(COMPANY.tagline)}</div>
          <div class="company-address">
            ${COMPANY.addressLines.map(line => `<div>${escapeHtml(line)}</div>`).join("")}
            <div class="company-gstin">GSTIN ${escapeHtml(COMPANY.gstin)}</div>
            <div>${escapeHtml(COMPANY.phone)}</div>
            <div>${escapeHtml(COMPANY.email)}</div>
          </div>
        </div>
      </div>
      <div class="doc-meta-section">
        <div class="doc-main-title">${escapeHtml(docTitle)}</div>
        <table class="meta-table">
          <tr><td>#</td><td>: ${escapeHtml(record.number)}</td></tr>
          <tr><td>${record.type === "Estimate" ? "Estimate Date" : (record.type === "Bill" ? "Bill Date" : "Invoice Date")}</td><td>: ${dateLabel(record.date)}</td></tr>
          <tr><td>Terms</td><td>: Due on Receipt</td></tr>
          <tr><td>Due Date</td><td>: ${dateLabel(record.date)}</td></tr>
          <tr><td>Place Of Supply</td><td>: ${placeOfSupply}</td></tr>
          ${record.paymentMode ? `<tr><td>Payment Mode</td><td>: ${escapeHtml(record.paymentMode)}</td></tr>` : ""}
          ${record.sourceNumber ? `<tr><td>Ref Document</td><td>: ${escapeHtml(record.sourceNumber)}</td></tr>` : ""}
        </table>
      </div>
    </header>

    <section class="bill-to-box">
      <div class="bill-to-header">${record.type === "Bill" ? "Customer Details / Billed To:" : "Bill To:"}</div>
      <div class="customer-name">${escapeHtml(customer.name)}</div>
      ${customer.location ? `<div class="customer-info-line">${escapeHtml(customer.location)}</div>` : ""}
      ${customer.project ? `<div class="customer-info-line">${escapeHtml(customer.project)}</div>` : ""}
      <div class="customer-info-line">${escapeHtml(record.state)}, India</div>
      ${customer.phone ? `<div class="customer-info-line">Phone: ${escapeHtml(customer.phone)}</div>` : ""}
      ${customer.gstin ? `<div class="customer-gstin-highlight">Customer GSTIN: ${escapeHtml(customer.gstin)}</div>` : ""}
    </section>

    ${!isNotes ? (
      record.type === "Bill" ? `
      <table class="items-table bill-items-table">
        <thead>
          <tr>
            <th style="width: 32px;">#</th>
            <th>Item Description</th>
            <th style="width: 140px;">Size / Dimensions</th>
            <th style="width: 80px;">Qty</th>
            <th style="width: 80px;">Rate</th>
            <th style="width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${billTableRows}
        </tbody>
      </table>
      ` : `
      <table class="items-table invoice-items-table">
        <thead>
          <tr>
            <th style="width: 28px;">#</th>
            <th>Description</th>
            <th style="width: 58px;">HSN/SAC</th>
            <th style="width: 70px;">Qty</th>
            <th style="width: 65px;">Rate</th>
            ${isKarnataka ? `
              <th style="width: 44px;">CGST %</th>
              <th style="width: 62px;">CGST Amt</th>
              <th style="width: 44px;">SGST %</th>
              <th style="width: 62px;">SGST Amt</th>
            ` : `
              <th style="width: 50px;">IGST %</th>
              <th style="width: 75px;">IGST Amt</th>
            `}
            <th style="width: 80px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableRows}
        </tbody>
      </table>
      `
    ) : ""}

    <div class="bottom-layout">
      <div class="bottom-left">
        <div class="amount-words-card">
          <div class="amount-words-title">Total In Words</div>
          <div class="amount-words-text">Indian Rupee ${escapeHtml(amountWords(totals.payable))} Only</div>
        </div>
        ${!isNotes ? termsMarkup : ""}
        <div class="signature-block">
          <div class="sig-thanks">Thanks for your business.</div>
          <div class="sig-name">${escapeHtml(COMPANY.signatory)}</div>
          <div class="sig-line">Authorized Signature</div>
        </div>
      </div>
      <div class="bottom-right">
        <table class="totals-table">
          <tr>
            <td class="text-left">Sub Total</td>
            <td class="text-right">${formatRawNumber(totals.subtotal)}</td>
          </tr>
          ${taxSummaryRows}
          <tr>
            <td class="text-left">Rounding</td>
            <td class="text-right">${
              Math.abs(totals.roundOff) < 0.005
                ? "0.00"
                : (totals.roundOff > 0 ? "+" : "−") + formatRawNumber(Math.abs(totals.roundOff))
            }</td>
          </tr>
          <tr class="grand-total-row">
            <td class="text-left">Total</td>
            <td class="text-right">₹${formatRawNumber(totals.payable, 2)}</td>
          </tr>
          <tr>
            <td class="text-left">Payment Status</td>
            <td class="text-right" style="font-weight: 700; color: ${
              record.paymentMode === "Paid" ? "#16a34a" : (record.paymentMode === "In Progress" ? "#d97706" : "#dc2626")
            };">${escapeHtml(record.paymentMode || "Paid")}</td>
          </tr>
          <tr>
            <td class="text-left">Payment Made</td>
            <td class="text-right">${
              record.paymentMode === "Paid"
                ? `(-) ₹${formatRawNumber(totals.payable, 2)}`
                : (record.paymentMode === "In Progress" ? "In Progress" : "₹0.00")
            }</td>
          </tr>
          <tr class="balance-due-row">
            <td class="text-left">Balance Due</td>
            <td class="text-right">${
              record.paymentMode === "Paid"
                ? "₹0.00"
                : (record.paymentMode === "In Progress" ? "Pending" : `₹${formatRawNumber(totals.payable, 2)}`)
            }</td>
          </tr>
        </table>
      </div>
    </div>

    ${notesBreakdown}
  </div>

  <script>
    window.addEventListener('load', () => {
      if (${autoPrint}) {
        const image = document.querySelector('.brand-logo');
        const print = () => setTimeout(() => window.print(), 250);
        if (image && !image.complete) image.addEventListener('load', print, { once: true });
        else print();
      }
    });
  </script>
</body>
</html>`;
  }

  function isMobileDevice() {
    try {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia && window.matchMedia("(max-width: 768px)").matches)
      );
    } catch {
      return false;
    }
  }

  function showDocumentInModal(record, isNotes = false, htmlPrecomputed = null) {
    currentRecord = record;
    currentIsNotes = !!isNotes;
    const html = htmlPrecomputed || documentHtml(record, isNotes, false);
    currentHtml = html;

    if (pdfPreviewFrame) {
      // Direct srcdoc avoids blob restrictions and popup blocking on Android Chrome
      try {
        pdfPreviewFrame.srcdoc = html;
      } catch (err) {
        console.warn("Could not set srcdoc on preview iframe:", err);
      }

      try {
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        currentBlobUrl = URL.createObjectURL(blob);
        if (!("srcdoc" in pdfPreviewFrame)) {
          pdfPreviewFrame.src = currentBlobUrl;
        }
      } catch (e) {
        console.warn("Could not create fallback blob:", e);
      }
    }

    if (pdfModalTitle) {
      pdfModalTitle.textContent = `${isNotes ? "Calculation Notes — " : ""}${record.type} ${record.number}`;
    }
    if (pdfModal) {
      pdfModal.hidden = false;
      document.body.classList.add("modal-open");
    }
    return currentBlobUrl;
  }

  function openPdf(record, isNotes = false, autoPrint = false, existingWindow = null) {
    const html = documentHtml(record, isNotes, autoPrint);

    // Always render directly in modal preview with srcdoc
    showDocumentInModal(record, isNotes, html);

    // If an existing desktop popup window was opened, populate it via document.write
    if (existingWindow && !existingWindow.closed) {
      try {
        existingWindow.document.open();
        existingWindow.document.write(html);
        existingWindow.document.close();
        return existingWindow;
      } catch (e) {
        console.warn("Could not write HTML to popup window:", e);
      }
    }
    return null;
  }

  function openPendingPdfWindow() {
    if (isMobileDevice()) return null;
    try {
      const popup = window.open("", "_blank");
      if (popup) {
        popup.document.open();
        popup.document.write("<!doctype html><title>Preparing document…</title><body style='font:15px Arial;padding:30px;color:#172033;background:#f8fafc'><h3 style='color:#084a9b'>Glass Care Enterprises</h3><p>Preparing your professional tax invoice / document…</p></body>");
        popup.document.close();
      }
      return popup;
    } catch {
      return null;
    }
  }

  async function generate(type, data = collectDetails(), sourceId = null) {
    let popup = null;
    try {
      // Open pending popup if desktop browser allows; regardless, modal preview will guarantee viewing
      popup = openPendingPdfWindow();
      showStatus(`Preparing ${type}…`);

      try {
        await window.GlassCareStore?.ready?.();
      } catch (e) {
        // ignore ready failure
      }

      const savedRecord = await createRecord(type, data, sourceId);
      if (!savedRecord) {
        if (popup && !popup.closed) popup.close();
        return;
      }

      // Render into both modal and new tab/window
      openPdf(savedRecord, false, false, popup);
      showStatus(`${type} ${savedRecord.number} is ready. View on screen or choose “Print / Save as PDF”.`);

      if (savedRecord.notesEnabled && popup && !popup.closed) {
        popup.addEventListener("afterprint", () => {
          if (!popup.closed) {
            try {
              const notesHtml = documentHtml(savedRecord, true, false);
              popup.document.open();
              popup.document.write(notesHtml);
              popup.document.close();
            } catch (e) {}
          }
        }, { once: true });
      }
    } catch (err) {
      console.error("Document generation failed:", err);
      if (popup && !popup.closed) popup.close();
      showStatus(`Could not generate ${type}: ${err.message}`, true);
      alert(`Could not generate ${type}: ${err.message}`);
    }
  }

  async function convertSource(source) {
    if (documents.some(doc => doc.type === "Invoice" && doc.sourceId === source.id)) {
      showStatus(`An invoice has already been created from ${source.number}.`, true);
      alert(`An invoice has already been created from ${source.number}.`);
      return;
    }
    if (!confirm(`Create a Tax Invoice from ${source.number}? The source document will remain unchanged.`)) return;
    const data = {
      customerName: source.customer.name,
      flatNo: source.customer.location,
      buildingName: source.customer.project,
      customerPhone: source.customer.phone,
      customerGstin: source.customer.gstin || "",
      paymentMode: source.paymentMode || "Paid",
      date: new Date().toISOString().slice(0, 10),
      state: source.state,
      items: source.items.map(item => ({ ...item }))
    };
    await generate("Invoice", data, source.id);
  }

  let currentFilter = "all";
  let searchQuery = "";

  function closeAllDocMenus() {
    document.querySelectorAll(".saved-doc-menu-dropdown").forEach(dropdown => {
      dropdown.hidden = true;
      const btn = dropdown.previousElementSibling;
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function renderDocuments() {
    if (!documentsList) return;

    let filtered = documents.slice();

    // 2. Filter tabs: All / Estimates / Bills / Invoices
    if (currentFilter !== "all") {
      filtered = filtered.filter(doc => String(doc.type || "").toLowerCase() === currentFilter.toLowerCase());
    }

    // 1. Search box (by document number or customer name)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(doc => {
        const num = String(doc.number || "").toLowerCase();
        const name = String(doc.customer?.name || "").toLowerCase();
        return num.includes(q) || name.includes(q);
      });
    }

    // 3. Sort newest first
    filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
      if (timeA !== timeB) return timeB - timeA;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });

    // 4. Show "No documents found" when nothing matches
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "no-documents-message";
      empty.textContent = (!documents.length && currentFilter === "all" && !q)
        ? "No documents generated yet."
        : "No documents found.";
      documentsList.replaceChildren(empty);
      return;
    }

    documentsList.replaceChildren(...filtered.map(record => {
      const row = document.createElement("div");
      row.className = "saved-document-row";

      const info = document.createElement("div");
      info.className = "saved-doc-info";

      const badge = document.createElement("span");
      const typeKey = (record.type || "Estimate").toLowerCase();
      badge.className = `type-badge doc-badge badge-${typeKey}`;
      badge.textContent = record.type;

      const number = document.createElement("strong");
      number.className = "saved-doc-number";
      number.textContent = record.number;

      const customer = document.createElement("span");
      customer.className = "saved-doc-customer";
      customer.textContent = record.customer?.name || "";

      const date = document.createElement("span");
      date.className = "saved-doc-date";
      date.textContent = dateLabel(record.date);

      const total = document.createElement("span");
      total.className = "saved-doc-total";
      const payableAmount = record.totals?.payable ?? record.totals?.unroundedTotal ?? record.totals?.subtotal ?? 0;
      total.textContent = format(payableAmount);

      info.append(badge, number, customer, date, total);

      const actions = document.createElement("div");
      actions.className = "saved-doc-actions";

      const printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.className = "primary-action saved-doc-view-btn";
      printBtn.textContent = "View / Print PDF";
      printBtn.addEventListener("click", () => {
        const popup = isMobileDevice() ? null : window.open("", "_blank");
        openPdf(record, false, false, popup);
      });
      actions.append(printBtn);

      const menuWrap = document.createElement("div");
      menuWrap.className = "saved-doc-menu-wrap";

      const menuBtn = document.createElement("button");
      menuBtn.type = "button";
      menuBtn.className = "saved-doc-menu-btn";
      menuBtn.setAttribute("aria-haspopup", "true");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("title", "More options");
      menuBtn.textContent = "⋯";

      const dropdown = document.createElement("div");
      dropdown.className = "saved-doc-menu-dropdown";
      dropdown.hidden = true;

      menuBtn.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = dropdown.hidden;
        closeAllDocMenus();
        if (willOpen) {
          dropdown.hidden = false;
          menuBtn.setAttribute("aria-expanded", "true");
        }
      });

      const notesBtn = document.createElement("button");
      notesBtn.type = "button";
      notesBtn.className = "saved-doc-menu-item";
      notesBtn.textContent = "Calculation Notes";
      notesBtn.addEventListener("click", () => {
        closeAllDocMenus();
        const popup = isMobileDevice() ? null : window.open("", "_blank");
        openPdf(record, true, false, popup);
      });
      dropdown.append(notesBtn);

      if (["Estimate", "Bill"].includes(record.type)) {
        const convertBtn = document.createElement("button");
        convertBtn.type = "button";
        convertBtn.className = "saved-doc-menu-item";
        convertBtn.textContent = "Convert to Invoice";
        convertBtn.addEventListener("click", () => {
          closeAllDocMenus();
          convertSource(record);
        });
        dropdown.append(convertBtn);
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "saved-doc-menu-item delete-item";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        closeAllDocMenus();
        if (!confirm("Delete this document?")) return;

        const index = documents.findIndex(doc => doc.id === record.id);
        if (index !== -1) {
          documents.splice(index, 1);
        }
        localStorage.setItem(STORAGE.documents, JSON.stringify(documents));

        if (window.GlassCareStore?.user && window.GlassCareStore?.client) {
          try {
            await window.GlassCareStore.client
              .from("glass_care_documents")
              .delete()
              .eq("id", String(record.id));
          } catch (err) {
            console.warn("Could not delete document from Supabase:", err);
          }
        }

        renderDocuments();
        showStatus(`${record.type} ${record.number} deleted.`);
      });
      dropdown.append(deleteBtn);

      menuWrap.append(menuBtn, dropdown);
      actions.append(menuWrap);

      row.append(info, actions);
      return row;
    }));
  }

  const searchInput = document.getElementById("savedDocsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", event => {
      searchQuery = event.target.value;
      renderDocuments();
    });
  }

  const tabContainer = document.querySelector(".saved-docs-tabs");
  if (tabContainer) {
    tabContainer.addEventListener("click", event => {
      const tabBtn = event.target.closest(".saved-docs-tab");
      if (!tabBtn) return;
      currentFilter = tabBtn.dataset.filter || "all";
      tabContainer.querySelectorAll(".saved-docs-tab").forEach(tab => {
        const isActive = tab === tabBtn;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      renderDocuments();
    });
  }

  document.addEventListener("click", event => {
    if (!event.target.closest(".saved-doc-menu-wrap")) {
      closeAllDocMenus();
    }
  });

  function closeModal() {
    if (pdfModal) pdfModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" || event.key === "Esc") {
      closeAllDocMenus();
      if (pdfModal && !pdfModal.hidden) {
        closeModal();
      }
    }
  });

  // Modal interactions
  if (modalPrintBtn) {
    modalPrintBtn.addEventListener("click", () => {
      try {
        if (pdfPreviewFrame?.contentWindow) {
          pdfPreviewFrame.contentWindow.focus();
          pdfPreviewFrame.contentWindow.print();
          return;
        }
      } catch (e) {
        console.warn("Could not print from iframe:", e);
      }
      if (currentRecord) {
        const printWin = window.open("", "_blank");
        if (printWin) {
          const html = documentHtml(currentRecord, currentIsNotes, true);
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
        }
      }
    });
  }
  if (modalNewTabBtn) {
    modalNewTabBtn.addEventListener("click", () => {
      if (currentRecord) {
        const win = window.open("", "_blank");
        if (win) {
          const html = documentHtml(currentRecord, currentIsNotes, false);
          win.document.open();
          win.document.write(html);
          win.document.close();
          return;
        }
      }
      if (currentBlobUrl) {
        window.open(currentBlobUrl, "_blank");
      }
    });
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }
  if (pdfModalBackdrop) {
    pdfModalBackdrop.addEventListener("click", closeModal);
  }

  document.getElementById("companySettingsBtn")?.addEventListener("click", () => {
    if (settingsPanel) {
      settingsPanel.hidden = !settingsPanel.hidden;
      settingsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  document.getElementById("saveSettingsBtn")?.addEventListener("click", async () => {
    settings.terms = termsText?.value || DEFAULT_TERMS.join("\n");
    try {
      if (window.GlassCareStore?.user && window.GlassCareStore?.saveSettings) {
        await GlassCareStore.saveSettings(settings);
      } else {
        localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
      }
      showStatus("Document settings saved.");
    } catch (error) {
      showStatus(`Settings could not be saved: ${error.message}`, true);
    }
  });

  document.getElementById("generateBillBtn")?.addEventListener("click", () => generate("Bill"));
  document.getElementById("generateInvoiceBtn")?.addEventListener("click", () => generate("Invoice"));
  document.getElementById("convertInvoiceBtn")?.addEventListener("click", () => {
    const source = documents.find(doc => ["Estimate", "Bill"].includes(doc.type));
    if (!source) {
      showStatus("Generate and save an estimate or bill first, then convert it from Saved documents.", true);
      alert("Generate and save an estimate or bill first, then use Convert to Invoice in Saved documents.");
      return;
    }
    convertSource(source);
  });

  window.addEventListener("glasscare:cloud-ready", event => {
    documents.splice(0, documents.length, ...(event.detail.documents || []));
    Object.assign(settings, event.detail.settings || {});
    if (termsText) termsText.value = settings.terms || DEFAULT_TERMS.join("\n");
    renderDocuments();
  });

  if (window.GlassCareStore?.ready) {
    window.GlassCareStore.ready().then(renderDocuments).catch(error => showStatus(error.message, true));
  } else {
    renderDocuments();
  }
})();
