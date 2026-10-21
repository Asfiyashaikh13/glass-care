(() => {
  "use strict";

  const STORAGE = {
    settings: "glassCareDocumentSettings",
    documents: "glassCareDocuments"
  };
  const DEFAULT_TERMS = [
    "Order once confirmed will not be taken back or exchanged.",
    "Any complaint related to processing quality should be informed at time of unloading duly remarked on DC.",
    "All disputes shall be subject to Bangalore jurisdiction only.",
    "Initial payment 70% of gross price to be paid at the time of ordering.",
    "Interim payment 20% of gross price on delivery Pallot glass & material of the goods to be used for the work.",
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
  termsText.value = settings.terms || DEFAULT_TERMS.join("\n");

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function dateLabel(isoDate) {
    const date = new Date(`${isoDate || new Date().toISOString().slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? escapeHtml(isoDate) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function format(value, decimals = 2) {
    return GlassCareCalculations.formatMoney(value, decimals);
  }

  function collectDetails() {
    return {
      customerName: document.getElementById("customerName").value.trim(),
      flatNo: document.getElementById("flatNo").value.trim(),
      buildingName: document.getElementById("buildingName").value.trim(),
      customerPhone: document.getElementById("customerPhone").value.trim(),
      date: document.getElementById("estimateDate").value,
      state: document.getElementById("customerState").value,
      items: estimateItems.map(item => ({
        id: item.id,
        category: item.category,
        itemName: item.itemName,
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
    try {
      if (window.GlassCareStore?.nextNumber) {
        number = await GlassCareStore.nextNumber(type);
        if (notesToggle.checked) calculationNumber = await GlassCareStore.nextNumber("Calculation");
      } else {
        number = nextLocalNumber(type);
        if (notesToggle.checked) calculationNumber = nextLocalNumber("Calculation");
      }
    } catch (error) {
      showStatus(`Could not reserve document number: ${error.message}`, true);
      return null;
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
        phone: data.customerPhone
      },
      items: data.items,
      totals,
      termsIncluded: type !== "Estimate" && termsToggle.checked,
      terms: termsToggle.checked ? termsText.value.split("\n").map(term => term.trim()).filter(Boolean) : [],
      notesEnabled: notesToggle.checked,
      createdAt: new Date().toISOString()
    };
    documents.unshift(record);
    try {
      if (window.GlassCareStore?.saveDocument) await GlassCareStore.saveDocument(record);
      else localStorage.setItem(STORAGE.documents, JSON.stringify(documents));
    } catch (error) {
      documents.shift();
      showStatus(`Document could not be saved to Supabase: ${error.message}`, true);
      return null;
    }
    renderDocuments();
    return record;
  }

  function nextLocalNumber(type) {
    const countersKey = "glassCareDocumentCounters";
    let counters = readJson(countersKey, {});
    if (!counters[type]) {
      const sequence = type === "Calculation" ? "calculationNumber" : "number";
      counters[type] = documents.reduce((maximum, record) => {
        const value = String(record[sequence] || "");
        const match = value.match(/-(\d+)$/);
        return match && (type === "Calculation" || record.type === type)
          ? Math.max(maximum, Number(match[1]))
          : maximum;
      }, 0);
    }
    counters[type] += 1;
    localStorage.setItem(countersKey, JSON.stringify(counters));
    return `GCE-${type}-${String(counters[type]).padStart(3, "0")}`;
  }

  function dimensionText(item) {
    if (item.unit === "Pcs" || item.unit === "Job") return "—";
    const dims = [item.height, item.width];
    if (item.unit === "Cubic Ft") dims.push(item.thickness);
    return `${dims.map(value => Math.round(value)).join(" × ")} mm`;
  }

  function amountWords(value) {
    return `${numberToWords(value)} Only`;
  }

  function totalsMarkup(record) {
    const totals = GlassCareCalculations.calculateTotals(record.items, record.state);
    const taxRows = totals.taxBreakdown.map(group => {
      const rate = group.rate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      if (record.state === "Karnataka") {
        const halfRate = (group.rate / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 });
        return `<div><span>CGST (${halfRate}%)</span><strong>${format(group.taxAmount / 2)}</strong></div><div><span>SGST (${halfRate}%)</span><strong>${format(group.taxAmount / 2)}</strong></div>`;
      }
      return `<div><span>IGST (${rate}%)</span><strong>${format(group.taxAmount)}</strong></div>`;
    }).join("");
    return `<div class="totals">
      <div><span>Gross subtotal</span><strong>${format(totals.grossSubtotal)}</strong></div>
      <div><span>Discount</span><strong>− ${format(totals.discountTotal)}</strong></div>
      <div><span>Taxable subtotal</span><strong>${format(totals.subtotal)}</strong></div>
      ${taxRows}
      <div><span>Round Off</span><strong>${format(totals.roundOff)}</strong></div>
      <div class="payable"><span>Grand Total</span><strong>${format(totals.payable, 0)}</strong></div>
      <p class="words"><b>Amount in words:</b> ${escapeHtml(amountWords(totals.payable))}</p>
    </div>`;
  }

  function itemRows(record) {
    const totals = GlassCareCalculations.calculateTotals(record.items, record.state);
    return totals.lines.map((line, index) => {
      const description = [line.category, line.itemName].filter(Boolean).join(" — ");
      const tax = record.state === "Karnataka"
        ? `CGST ${line.gstRate / 2}% + SGST ${line.gstRate / 2}%`
        : `IGST ${line.gstRate}%`;
      return `<tr>
        <td class="number">${index + 1}</td>
        <td><b>${escapeHtml(description)}</b><small>${escapeHtml(dimensionText(line))}</small></td>
        <td>${escapeHtml(line.unit)}<small>Qty: ${line.quantity} · ${escapeHtml(line.measureLabel)}</small></td>
        <td class="number">${format(line.rate, 0)}</td>
        <td class="number">${line.discountPercent}%</td>
        <td class="number">${format(line.taxableAmount)}</td>
        <td>${escapeHtml(tax)}<small>${format(line.taxAmount)}</small></td>
        <td class="number">${format(line.taxableAmount + line.taxAmount)}</td>
      </tr>`;
    }).join("");
  }

  function termsMarkup(record) {
    if (!record.termsIncluded || !record.terms?.length) return "";
    return `<section class="terms"><h2>Terms &amp; Conditions</h2><ol>${record.terms.map(term => `<li>${escapeHtml(term)}</li>`).join("")}</ol></section>`;
  }

  function documentHtml(record, isNotes = false, autoPrint = true) {
    const title = `${isNotes ? record.calculationNumber : record.number}.pdf`;
    const logoUrl = new URL("assets/glass-care-logo.jpeg", document.baseURI).href;
    const rows = itemRows(record);
    const totals = totalsMarkup(record);
    const customer = record.customer;
    const details = [customer.location, customer.project, customer.phone].filter(Boolean).map(escapeHtml);
    const tableHead = `<thead><tr><th>#</th><th>Item description &amp; dimensions</th><th>Unit / Qty / Measure</th><th>Rate (₹)</th><th>Discount</th><th>Taxable (₹)</th><th>GST rate / tax</th><th>Line total (₹)</th></tr></thead>`;
    const notes = isNotes ? `<section class="notes-breakdown"><h2>Item calculation details</h2>${record.items.map((item, index) => {
      const line = GlassCareCalculations.calculateLine(item);
      const taxBreakdown = record.state === "Karnataka"
        ? `CGST ${line.gstRate / 2}% ${format(line.taxAmount / 2)} + SGST ${line.gstRate / 2}% ${format(line.taxAmount / 2)}`
        : `IGST ${line.gstRate}% ${format(line.taxAmount)}`;
      return `<article><h3>${index + 1}. ${escapeHtml([item.category, item.itemName].filter(Boolean).join(" — "))}</h3>
        <p><b>Dimensions:</b> ${escapeHtml(dimensionText(item))} · <b>Unit:</b> ${escapeHtml(item.unit)} · <b>Qty:</b> ${item.quantity} · <b>Measure:</b> ${escapeHtml(line.measureLabel)}</p>
        <p><b>Calculation:</b> ${escapeHtml(line.formula)} = ${format(line.grossAmount)}; discount ${line.discountPercent}% = −${format(line.discountAmount)}; taxable amount ${format(line.taxableAmount)}.</p>
        <p><b>GST:</b> ${escapeHtml(taxBreakdown)} · <b>Line total:</b> ${format(line.taxableAmount + line.taxAmount)}</p></article>`;
    }).join("")}
      <h2>Document total calculation</h2><p>Gross subtotal ${format(record.totals.grossSubtotal)} − discount ${format(record.totals.discountTotal)} = taxable subtotal ${format(record.totals.subtotal)}. Taxes ${format(record.totals.taxTotal)}. Unrounded total ${format(record.totals.unroundedTotal)} + round off ${format(record.totals.roundOff)} = payable ${format(record.totals.payable, 0)}.</p>
      <p class="reference">This calculation note refers to ${escapeHtml(record.type)} ${escapeHtml(record.number)}.</p></section>` : "";
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
      <style>
        @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:10pt Arial,Helvetica,sans-serif;color:#172033;margin:0;line-height:1.35}.top{display:flex;align-items:center;gap:14px;border-bottom:3px solid #ef7625;padding-bottom:10px}.logo{width:86px;height:86px;object-fit:contain}.company h1{font-size:20pt;color:#084a9b;margin:0}.company p{color:#ec6d1e;letter-spacing:2px;margin:5px 0 0;font-weight:bold}.doc-meta{text-align:right;margin-left:auto}.doc-meta h2{font-size:17pt;color:#084a9b;margin:0 0 4px}.doc-meta strong{font-size:12pt}.doc-meta div{font-size:11pt;font-weight:700;color:#172033;margin-top:2px}.customer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;padding:10px;background:#f2f6fc;border-left:4px solid #ef7625}.customer b{display:block;color:#526176;font-size:8.5pt}.customer .value{font-size:10pt;overflow-wrap:anywhere}.items{width:100%;border-collapse:collapse;table-layout:fixed}.items th{background:#084a9b;color:white;text-align:left;font-size:7.2pt;padding:6px 4px}.items td{border-bottom:1px solid #d8e0eb;padding:6px 4px;font-size:8pt;vertical-align:top;overflow-wrap:anywhere}.items small{display:block;color:#526176;margin-top:2px;font-size:7.3pt}.items td:first-child,.items th:first-child{width:4%}.items td:nth-child(2),.items th:nth-child(2){width:25%}.items td:nth-child(3),.items th:nth-child(3){width:7%}.items td:nth-child(4),.items th:nth-child(4){width:5%}.items td:nth-child(5),.items th:nth-child(5){width:12%}.items td:nth-child(6),.items th:nth-child(6){width:9%}.items td:nth-child(7),.items th:nth-child(7){width:6%}.items td:nth-child(8),.items th:nth-child(8){width:16%}.items td:nth-child(9),.items th:nth-child(9){width:16%}.number{text-align:right;font-variant-numeric:tabular-nums}.items thead{display:table-header-group}.items tr{break-inside:avoid}.lower{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}.totals{max-width:100%;margin-left:auto}.totals>div{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e4e9f0;padding:4px 0}.totals strong{text-align:right;white-space:nowrap}.totals .payable{font-size:14pt;color:#084a9b;border-top:2px solid #ef7625;border-bottom:0;padding-top:8px}.words{padding:8px;background:#fff7f0;border-radius:4px;font-size:9pt}.terms{margin-top:10px;padding:8px 10px;background:#f8fafc;border:1px solid #d8e0eb;break-inside:avoid}.terms h2,.notes-breakdown h2{font-size:10pt;color:#084a9b;margin:0 0 5px}.terms ol{margin:0;padding-left:18px}.terms li{font-size:7.5pt;margin:2px 0}.signature{display:flex;justify-content:flex-end;margin-top:24px}.signature span{border-top:1px solid #172033;padding:5px 22px 0}.notes-breakdown{margin-top:14px}.notes-breakdown article{border-bottom:1px solid #d8e0eb;padding:5px 0;break-inside:avoid}.notes-breakdown h3{font-size:9pt;margin:0 0 3px;color:#084a9b}.notes-breakdown p{font-size:8pt;margin:2px 0}.reference{font-weight:bold;margin-top:10px}.footer{margin-top:12px;border-top:1px solid #d8e0eb;padding-top:5px;font-size:8pt;color:#526176}.no-print{margin-bottom:0}
        .items td:nth-child(2),.items th:nth-child(2){width:21%}.items td:nth-child(5),.items th:nth-child(5){width:10%}.items td:nth-child(6),.items th:nth-child(6){width:8%}.items td:nth-child(8),.items th:nth-child(8){width:11%}.items td:nth-child(9),.items th:nth-child(9){width:14%}.items td:nth-child(10),.items th:nth-child(10){width:14%}.print-toolbar{position:sticky;top:0;z-index:3;padding:10px 0;background:#fff}.print-toolbar button{border:0;border-radius:6px;background:#084a9b;color:#fff;padding:9px 14px;font-size:11pt;font-weight:bold;cursor:pointer}.print-toolbar span{margin-left:10px;color:#526176;font-size:9pt}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.no-print,.print-toolbar{display:none!important}}
        .items th{font-size:8pt;padding:7px 5px}.items td{font-size:8.5pt;padding:7px 5px}.items small{font-size:8pt}.items th:nth-child(1),.items td:nth-child(1){width:4%}.items th:nth-child(2),.items td:nth-child(2){width:29%}.items th:nth-child(3),.items td:nth-child(3){width:16%}.items th:nth-child(4),.items td:nth-child(4){width:9%}.items th:nth-child(5),.items td:nth-child(5){width:8%}.items th:nth-child(6),.items td:nth-child(6){width:12%}.items th:nth-child(7),.items td:nth-child(7){width:13%}.items th:nth-child(8),.items td:nth-child(8){width:9%}
      </style></head><body>
      <div class="print-toolbar no-print"><button type="button" onclick="window.print()">Print / Save PDF</button><span>Review this document, then choose Save as PDF in your browser’s print dialog.</span></div>
      <header class="top"><img class="logo" src="${escapeHtml(logoUrl)}" alt="Glass Care logo"><div class="company"><h1>GLASS CARE ENTERPRISES</h1><p>FRAME YOUR VISION</p></div><div class="doc-meta"><h2>${isNotes ? "CALCULATION NOTES" : escapeHtml(record.type.toUpperCase())}</h2><strong>${escapeHtml(record.number)}</strong><div>${dateLabel(record.date)}</div><div>${escapeHtml(record.state)}</div></div></header>
      <section class="customer"><div><b>Customer</b><div class="value">${escapeHtml(customer.name)}</div></div><div><b>Flat / Location</b><div class="value">${escapeHtml(customer.location || "—")}</div></div><div><b>Project</b><div class="value">${escapeHtml(customer.project || "—")}</div></div><div><b>Phone</b><div class="value">${escapeHtml(customer.phone || "—")}</div></div>
      ${record.sourceNumber ? `<div><b>Converted from</b><div class="value">${escapeHtml(record.sourceNumber)}</div></div>` : ""}</section>
      ${isNotes ? "" : `<table class="items">${tableHead}<tbody>${rows}</tbody></table>`}
      ${isNotes ? `${totals}${notes}` : `<div class="lower">${totals}</div>${termsMarkup(record)}<div class="signature"><span>Authorized Signature</span></div>`}
        <footer class="footer">${isNotes ? `Calculation notes for ${escapeHtml(record.type)} ${escapeHtml(record.number)}` : `Glass Care Enterprises · ${escapeHtml(record.number)}`}</footer>
        <script>window.addEventListener('load',()=>{if(!${autoPrint})return;const image=document.querySelector('.logo');const print=()=>setTimeout(()=>window.print(),250);if(image.complete)print();else image.addEventListener('load',print,{once:true});image.addEventListener('error',print,{once:true});});</script></body></html>`;
  }

      function openPdf(record, isNotes = false, autoPrint = true, popup = null) {
        popup = popup || window.open("", "_blank");
    if (!popup) {
      showStatus("Allow pop-ups for this site to open the printable PDF document.", true);
      alert("Allow pop-ups for this site, then generate the document again.");
      return null;
    }
    popup.document.open();
    popup.document.write(documentHtml(record, isNotes, autoPrint));
    popup.document.close();
    return popup;
  }

  function openPendingPdfWindow() {
    const popup = window.open("", "_blank");
    if (!popup) {
      showStatus("Allow pop-ups for this site to open the printable PDF document.", true);
      alert("Allow pop-ups for this site, then generate the document again.");
      return null;
    }
    popup.document.write("<!doctype html><title>Preparing document…</title><p style='font:16px Arial;padding:24px'>Preparing your document…</p>");
    popup.document.close();
    return popup;
  }

  async function generate(type, data = collectDetails(), sourceId = null) {
    const popup = openPendingPdfWindow();
    if (!popup) return;
    await window.GlassCareStore?.ready?.();
    const savedRecord = await createRecord(type, data, sourceId);
    if (!savedRecord) {
      popup.close();
      return;
    }
    openPdf(savedRecord, false, false, popup);
    showStatus(`${type} ${savedRecord.number} is ready. Choose “Save as PDF” in the print dialog.`);
    if (savedRecord.notesEnabled) {
      popup.addEventListener("afterprint", () => {
        if (!popup.closed) {
          popup.document.open();
          popup.document.write(documentHtml(savedRecord, true));
          popup.document.close();
        }
        showStatus(`${type} and its separate calculation notes are ready to save as PDFs.`);
      }, { once: true });
    }
  }

  async function convertSource(source) {
    if (documents.some(doc => doc.type === "Invoice" && doc.sourceId === source.id)) {
      showStatus(`An invoice has already been created from ${source.number}.`, true);
      return;
    }
    if (!confirm(`Create an invoice from ${source.number}? The source document will remain unchanged.`)) return;
    const popup = openPendingPdfWindow();
    if (!popup) return;
    const data = {
      customerName: source.customer.name,
      flatNo: source.customer.location,
      buildingName: source.customer.project,
      customerPhone: source.customer.phone,
      date: new Date().toISOString().slice(0, 10),
      state: source.state,
      items: source.items.map(item => ({ ...item }))
    };
    const record = await createRecord("Invoice", data, source.id);
    if (!record) {
      popup.close();
      return;
    }
    openPdf(record, false, false, popup);
    if (popup && record.notesEnabled) popup.addEventListener("afterprint", () => {
      if (popup.closed) return;
      popup.document.open();
      popup.document.write(documentHtml(record, true));
      popup.document.close();
    }, { once: true });
    showStatus(`Invoice ${record.number} created from ${source.number}. The original is unchanged.`);
  }

  function renderDocuments() {
    if (!documents.length) {
      documentsList.textContent = "No documents generated yet.";
      return;
    }
    documentsList.replaceChildren(...documents.slice(0, 12).map(record => {
      const row = document.createElement("div");
      row.className = "saved-document-row";
      const label = document.createElement("span");
      label.textContent = `${record.type} · ${record.number} · ${record.customer?.name || ""}`;
      const printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.textContent = "Open PDF";
      printBtn.addEventListener("click", () => openPdf(record, false, false));
      row.append(label, printBtn);
      if (record.notesEnabled) {
        const notesBtn = document.createElement("button");
        notesBtn.type = "button";
        notesBtn.textContent = "Open Calculation Notes";
        notesBtn.addEventListener("click", () => openPdf(record, true, false));
        row.append(notesBtn);
      }
      if (["Estimate", "Bill"].includes(record.type)) {
        const convertBtn = document.createElement("button");
        convertBtn.type = "button";
        convertBtn.textContent = "Convert to Invoice";
        convertBtn.addEventListener("click", () => convertSource(record));
        row.append(convertBtn);
      }
      return row;
    }));
  }

  document.getElementById("companySettingsBtn").addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
    settingsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    settings.terms = termsText.value;
    try {
      if (window.GlassCareStore?.saveSettings) await GlassCareStore.saveSettings(settings);
      else localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
      showStatus("Document settings saved to Supabase.");
    } catch (error) {
      showStatus(`Settings could not be saved: ${error.message}`, true);
    }
  });
  document.getElementById("generateEstimateBtn").addEventListener("click", () => generate("Estimate"));
  document.getElementById("generateBillBtn").addEventListener("click", () => generate("Bill"));
  document.getElementById("convertInvoiceBtn").addEventListener("click", () => {
    const source = documents.find(doc => ["Estimate", "Bill"].includes(doc.type));
    if (!source) {
      showStatus("Generate and save an estimate or bill first, then convert it from Saved documents.", true);
      alert("Generate and save an estimate or bill first, then use Convert to Invoice in Saved documents.");
      return;
    }
    convertSource(source);
  });

  window.addEventListener("glasscare:cloud-ready", event => {
    documents.splice(0, documents.length, ...event.detail.documents);
    Object.assign(settings, event.detail.settings || {});
    termsText.value = settings.terms || DEFAULT_TERMS.join("\n");
    renderDocuments();
  });
  if (window.GlassCareStore?.ready) {
    window.GlassCareStore.ready().then(renderDocuments).catch(error => showStatus(error.message, true));
  } else {
    renderDocuments();
  }
})();
