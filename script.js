const MM_PER_FOOT = 304.8;
const SQFT_MM = 92903.04;
const GST_RATE = 18;
const savedEstimate = (() => {
  try { return JSON.parse(localStorage.getItem("glassCareEstimate") || "[]"); }
  catch { return []; }
})();
const savedDraft = (() => {
  try { return JSON.parse(localStorage.getItem("glassCareDraft") || "{}"); }
  catch { return {}; }
})();
let estimateItems = Array.isArray(savedEstimate) ? savedEstimate : [];

/* ELEMENTS */
const categorySelect = document.getElementById("category");
const categoryCustom = document.getElementById("categoryCustom");
const itemNameSelect = document.getElementById("itemName");
const itemNameCustom = document.getElementById("itemNameCustom");
const height = document.getElementById("height");
const width = document.getElementById("width");
const thickness = document.getElementById("thickness");
const quantity = document.getElementById("quantity");
const rate = document.getElementById("rate");
const discountPercent = document.getElementById("discountPercent");
const gstRateInput = document.getElementById("gstRate");
const unitDisplay = document.getElementById("unitDisplay");
const originalSize = document.getElementById("originalSize");
const roundedSize = document.getElementById("roundedSize");
const areaDisplay = document.getElementById("areaDisplay");
const amountDisplay = document.getElementById("amountDisplay");
const estimateBody = document.getElementById("estimateBody");
const subtotalDisplay = document.getElementById("subtotal");
const taxBreakdownRows = document.getElementById("taxBreakdownRows");
const grandTotalDisplay = document.getElementById("grandTotal");
const customerState = document.getElementById("customerState");
const amountWords = document.getElementById("amountWords");
const rateSourceTag = document.getElementById("rateSourceTag");
const editRateBtn = document.getElementById("editRateBtn");
const saveRateBtn = document.getElementById("saveRateBtn");
const toggleRateBook = document.getElementById("toggleRateBook");
const rateBookPanel = document.getElementById("rateBookPanel");
const rateBookList = document.getElementById("rateBookList");
const rateBookCount = document.getElementById("rateBookCount");
let isRateEditing = false;

/* ---------- RATE BOOK (saved base rates per category, kept in the browser) ---------- */
const RATE_BOOK_KEY = "glassCareRateBook";

// Default rates for all glass categories (keys are lowercase for matching)
const DEFAULT_RATES = {
  "antique decorative etching design, color, acid texture & clusters 10mm flat tough glass.": 300,
  "aquarium 10mm toughened flat glass work.": 300,
  "aquarium 8+8mm toughened laminated flat glass work.": 300,
  "balcony etching color, acid texture 10mm flat toughened design glass.": 300,
  "balcony plain 10mm flat toughened design glass with holes.": 300,
  "balcony plain 10mm flat toughened etching design glass.": 300,
  "balcony wall railing stainless steel studs hardware of no's": 300,
  "bar unit glass floor 12+12mm toughened laminated flat glass work.": 300,
  "beveled polished design 6mm flat glass.": 300,
  "beveled polished plain 6mm flat glass.": 300,
  "border design 6mm flat glass.": 300,
  "border design color 6mm flat glass.": 300,
  "box design color 6mm flat glass.": 300,
  "c half polished 10mm flat glass.": 300,
  "c polished plain 10mm flat glass.": 300,
  "calming glass pattern decorative design 10mm flat tough glass.": 300,
  "canopy 10mm flat toughened design glass with installation, hardware.": 300,
  "canopy 10mm flat toughened plain glass with installation, hardware.": 300,
  "ceiling design color & acid texture 6mm flat glass.": 300,
  "center etching color design 6mm flat glass.": 300,
  "center etching color lord design 6mm flat glass.": 300,
  "center etching design 6mm flat glass.": 300,
  "center etching lord design 6mm flat glass.": 300,
  "center etching lord design color & acid texture 6mm flat glass.": 300,
  "center multiplayer deep etching design color, acid texture 8mm flat glass.": 300,
  "corner etching color design 6mm flat glass.": 300,
  "corner etching design 6mm flat glass.": 200,
  "digital hd print design 8mm flat glass.": 300,
  "door plain polished 10mm flat tough glass with installation, hardware.": 300,
  "door plain polished tough 10mm flat glass.": 300,
  "door side fixed partition 10mm flat toughened design glass.": 300,
  "door side fixed partition 10mm flat toughened plain glass with installation, hardware.": 300,
  "false ceiling design color & acid texture 6mm flat glass.": 300,
  "flooring aria 10+10mm toughened laminated glass work.": 300,
  "glass cabinets plain polished tough 10mm flat glass.": 300,
  "glass cabinets v groove, etching color, acid texture polished tough 10mm flat glass.": 300,
  "glass mural design antique decorative etching design, color, acid texture & clusters 8mm flat tough glass.": 300,
  "glazing one way vision 4mm flat glass.": 300,
  "hall aria decorative design 6mm bronze flat tough glass.": 300,
  "hall aria decorative design 6mm design flat tough glass.": 300,
  "hall aria plain 6mm flat tough glass.": 300,
  "kitchen shutters v groove, etching color, acid texture 6mm toughened flat design glass.": 300,
  "kitchen unit shutters beveled polished design 6mm flat glass.": 300,
  "kitchen unit shutters beveled polished design 6mm tough flat glass.": 300,
  "kitchen unit shutters lacquered decorative design 6mm flat tough glass.": 300,
  "lacquered decorative design 6mm flat tough glass.": 300,
  "lacquered plain 6mm flat glass.": 300,
  "lord figure etching color acid texture design 6mm flat glass.": 300,
  "lord figure etching color design 6mm flat glass.": 300,
  "lord figure etching design 6mm flat glass.": 300,
  "lord figure multilayer deep etching lord design color, acid texture 8mm flat glass.": 300,
  "main door plain polished tough 10mm flat glass with installation, hardware.": 300,
  "main door 10mm tough polished antique glass etching design, color, acid": 300,
  "mirror beveled polished 6mm flat glass.": 300,
  "mirror beveled polished design 6mm flat glass.": 300,
  "mirror beveled sensor lighting 6mm flat bathroom & living aria glass.": 300,
  "mirror border etching design, color 6mm flat glass.": 300,
  "mirror design colors 6mm flat glass.": 300,
  "mirror polished 6mm flat glass.": 300,
  "mirror polished antique glass etching design, color, acid texture & clusters.": 300,
  "mirror sensor lighting 6mm flat bathroom & living aria glass.": 300,
  "name plates etching color, acid texture 10mm toughened flat design glass.": 300,
  "name plates stained 4mm & 6mm toughened sandwich glass work with holes.": 300,
  "polished 6mm plain flat glass.": 300,
  "pooja door 10mm flat polished tough design glass etching color, acid texture.": 300,
  "pooja door plain polished tough 10mm flat glass.": 300,
  "pooja fixed partition polished 10mm flat glass.": 300,
  "pooja partition hollow design etching color, acid texture polished 6mm flat glass.": 300,
  "round ceiling design etching 6mm flat tough glass.": 300,
  "round ceiling design etching color & acid texture 6mm flat tough glass.": 300,
  "saint gobain original lacquered 6mm flat glass.": 300,
  "saint gobain original lacquered decorative design 6mm flat glass.": 300,
  "shower cubicle polished 10mm flat tough glass & installation only.": 300,
  "shower cubicle polished 10mm flat tough glass with installation @ hardware.": 300,
  "sky light 10mm plain toughened flat glass.": 300,
  "sky light 10mm toughened flat design glass etching color, acid texture.": 300,
  "spider fittings polished 12mm flat tough glasses with installation, hardware.": 300,
  "stained 4mm & 6mm toughened sandwich glass work.": 300,
  "staircase railing 10mm flat toughened plain glass.": 300,
  "staircase railing 10mm toughened flat design glass etching color, acid texture.": 300,
  "staircase steps stainless steel studs hardware of no's": 300,
  "staircase wall aria decorative design 6mm bronze flat tough glass.": 300,
  "staircase wall aria decorative design 6mm flat tough glass": 300,
  "steps chipped shine 12mm flat plain glass.": 300,
  "steps zigzag shine 12mm flat plain glass.": 300,
  "stripes line etching 6mm flat glass.": 300,
  "table top polished 10mm flat plain glass.": 300,
  "table top taper & polished 10mm flat plain glass.": 300,
  "taper polished 6mm flat plain glass.": 300,
  "tv unit decorative design 10mm flat tough glass.": 300,
  "ultra white 10mm toughened flat design glass etching color, acid texture.": 300,
  "ultra white lacquered 6mm flat glass.": 300,
  "ultra white lacquered decorative design 6mm flat tough glass.": 300,
  "ultra white polished 6mm flat design glass etching color, acid texture.": 300,
  "ultra white polished plain 10mm flat glass.": 300,
  "ultra white polished plain 6mm flat glass.": 300,
  "ultra white taper polished 10mm flat plain glass.": 300,
  "v groove, etching color, acid texture 10mm toughened flat design glass.": 300,
  "vector glass pattern decorative design 10mm flat tough glass.": 300,
  "wall aria decorative design 6mm bronze flat tough glass.": 300,
  "wall aria decorative design 6mm flat tough glass.": 300,
  "wall unit lacquered decorative design 6mm flat tough glass.": 300,
  "wardrobe 10mm toughened flat design glass etching color, acid texture.": 300,
  "wardrobe lacquered decorative design 6mm flat tough glass.": 300,
  "texture & clusters with installation, hardware.": 300
};

function loadRateBook() {
  try {
    const raw = localStorage.getItem(RATE_BOOK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // First time: load defaults from Excel
    return { ...DEFAULT_RATES };
  } catch (e) {
    return { ...DEFAULT_RATES };
  }
}

function saveRateBook(book) {
  try {
    localStorage.setItem(RATE_BOOK_KEY, JSON.stringify(book));
  } catch (e) {
    // localStorage unavailable — rate book just won't persist across reloads
  }
}

let rateBook = loadRateBook();

// Merge rates extracted from the provided Excel sheet (if the JSON file exists).
// This file is generated from -GCE Meas_42.xlsx and is optional. Values here override defaults.
fetch('rates_from_excel.json')
  .then(resp => { if (!resp.ok) throw new Error('no file'); return resp.json(); })
  .then(obj => {
    // obj is mapping: category string -> rate number
    Object.keys(obj).forEach(k => {
      try {
        const v = Number(obj[k]) || 0;
        // preserve the key as-is; lookup uses normalization
        rateBook[k] = v;
      } catch (e) {
        // ignore
      }
    });
    renderRateBook();
    updateCalculation();
  })
  .catch(() => {
    // rates_from_excel.json not present or invalid — silently ignore
  });

function rateBookKeyFor(categoryValue) {
  return categoryValue.trim().toLowerCase();
}

// Normalize category strings for more tolerant matching (smart quotes, extra spaces, etc.)
function normalizeKey(s) {
  if (!s) return "";
  return s.trim()
    .toLowerCase()
    // normalize smart apostrophes / quotes to plain ASCII
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // collapse multiple spaces
    .replace(/\s+/g, ' ');
}

function findRateForCategory(categoryValue) {
  const target = normalizeKey(categoryValue);
  for (const k in rateBook) {
    if (normalizeKey(k) === target) return rateBook[k];
  }
  return undefined;
}

/* Auto-fill the Rate field from the rate book when a category is picked */
function applyRateBookSuggestion() {
  const categoryValue = getSelectedValue(categorySelect, categoryCustom);
  if (!categoryValue) {
    rateSourceTag.textContent = "";
    rate.value = 0;
    rate.setAttribute("readonly", "");
    isRateEditing = false;
    editRateBtn.style.display = "block";
    saveRateBtn.style.display = "none";
    updateCalculation();
    return;
  }
  const found = findRateForCategory(categoryValue);
  if (found !== undefined) {
    rate.value = found;
    rate.setAttribute("readonly", "");
    isRateEditing = false;
    editRateBtn.style.display = "block";
    saveRateBtn.style.display = "none";
    rateSourceTag.textContent = "✓ auto-filled from Rate Book";
    rateSourceTag.style.color = "#17733f";
  } else {
    // New categories have no saved rate, so allow direct manual entry.
    rate.value = "";
    rate.removeAttribute("readonly");
    isRateEditing = true;
    editRateBtn.style.display = "none";
    saveRateBtn.style.display = "block";
    rateSourceTag.textContent = "⚠ no saved rate — enter manually";
    rateSourceTag.style.color = "#d97706";
  }
  editRateBtn.textContent = "✏️ Edit";
  editRateBtn.style.background = "white";
  editRateBtn.style.color = "#26364d";
  editRateBtn.style.borderColor = "#cbd5e1";
  updateCalculation();
}

editRateBtn.addEventListener("click", () => {
  if (!isRateEditing) {
    // Enter edit mode
    rate.removeAttribute("readonly");
    rate.focus();
    isRateEditing = true;
    editRateBtn.textContent = "✓ Confirm";
    editRateBtn.style.background = "#17733f";
    editRateBtn.style.color = "white";
    editRateBtn.style.borderColor = "#17733f";
  } else {
    // Save and exit edit mode
    const categoryValue = getSelectedValue(categorySelect, categoryCustom);
    if (!categoryValue) {
      alert("Select or type a Product Category first.");
      return;
    }
    const value = Number(rate.value) || 0;
    const key = rateBookKeyFor(categoryValue);
    rateBook[key] = value;
    saveRateBook(rateBook);
    rateSourceTag.textContent = `✓ saved ₹${value} as default`;
    rateSourceTag.style.color = "#17733f";

    // Exit edit mode
    rate.setAttribute("readonly", "");
    isRateEditing = false;
    editRateBtn.style.display = "block";
    editRateBtn.textContent = "✏️ Edit";
    editRateBtn.style.background = "white";
    editRateBtn.style.color = "#26364d";
    editRateBtn.style.borderColor = "#cbd5e1";
    renderRateBook();
    updateCalculation();
  }
});

saveRateBtn.addEventListener("click", () => {
  const categoryValue = getSelectedValue(categorySelect, categoryCustom);
  if (!categoryValue) {
    alert("Select or type a Product Category first, so I know what to save this rate under.");
    return;
  }
  const value = Number(rate.value) || 0;
  const key = rateBookKeyFor(categoryValue);
  rateBook[key] = value;
  saveRateBook(rateBook);
  rateSourceTag.textContent = `✓ saved ₹${value} as default for this category`;
  rate.setAttribute("readonly", "");
  isRateEditing = false;
  editRateBtn.style.display = "block";
  editRateBtn.textContent = "✏️ Edit";
  saveRateBtn.style.display = "none";
  renderRateBook();
  updateCalculation();
});

toggleRateBook.addEventListener("click", () => {
  const isHidden = rateBookPanel.style.display === "none";
  rateBookPanel.style.display = isHidden ? "block" : "none";
  toggleRateBook.textContent = isHidden ? "⚙ Hide Rate Book" : "⚙ Manage Rate Book";
});

function renderRateBook() {
  const keys = Object.keys(rateBook);
  rateBookCount.textContent = keys.length ? `${keys.length} saved` : "";
  rateBookList.innerHTML = "";

  if (keys.length === 0) {
    rateBookList.innerHTML = `<div class="rate-book-empty">No rates saved yet. Pick a category, set a rate, and hit 💾 to save it.</div>`;
    return;
  }

  keys.sort().forEach(key => {
    const row = document.createElement("div");
    row.className = "rate-book-row";

    const name = document.createElement("div");
    name.className = "rb-name";
    name.textContent = key;
    name.title = key;

    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.value = rateBook[key];
    valueInput.addEventListener("change", () => {
      rateBook[key] = Number(valueInput.value) || 0;
      saveRateBook(rateBook);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "rb-delete";
    deleteBtn.textContent = "🗑";
    deleteBtn.addEventListener("click", () => {
      delete rateBook[key];
      saveRateBook(rateBook);
      renderRateBook();
    });

    row.appendChild(name);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    rateBookList.appendChild(row);
  });
}

/* INITIALIZE DROPDOWNS FROM data.js (real sheet lists) */
function fillSelect(select, list, insertBeforeCustom) {
  list.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value.length > 70 ? value.slice(0, 70) + "…" : value;
    option.title = value;
    select.insertBefore(option, insertBeforeCustom ? select.querySelector('option[value="__custom__"]') : null);
  });
}

function initialize() {
  fillSelect(categorySelect, glassCategories, true);
  fillSelect(itemNameSelect, itemNames, true);

  states.forEach(s => {
    const option = document.createElement("option");
    option.value = s;
    option.textContent = s;
    customerState.appendChild(option);
  });
  customerState.value = states[0] || "";

  ["customerName", "flatNo", "buildingName", "customerPhone"].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.value = savedDraft[id] || "";
      field.addEventListener("input", persistDraft);
    }
  });
  if (savedDraft.state && states.includes(savedDraft.state)) customerState.value = savedDraft.state;

  document.getElementById("estimateDate").value = savedDraft.date || new Date().toISOString().split("T")[0];
  document.getElementById("estimateNumber").textContent = generateEstimateNumber();

  renderEstimate();
  updateCalculation();
  renderRateBook();
}

function persistDraft() {
  const draft = {
    customerName: document.getElementById("customerName")?.value || "",
    flatNo: document.getElementById("flatNo")?.value || "",
    buildingName: document.getElementById("buildingName")?.value || "",
    customerPhone: document.getElementById("customerPhone")?.value || "",
    date: document.getElementById("estimateDate")?.value || "",
    state: customerState.value
  };
  try { localStorage.setItem("glassCareDraft", JSON.stringify(draft)); } catch { /* storage may be disabled */ }
}

/* CUSTOM VALUE TOGGLES */
function wireCustomToggle(select, customInput, onChangeExtra) {
  select.addEventListener("change", () => {
    if (select.value === "__custom__") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
      customInput.value = "";
    }
    updateCalculation();
    if (onChangeExtra) onChangeExtra();
  });
}
wireCustomToggle(categorySelect, categoryCustom, applyRateBookSuggestion);
wireCustomToggle(itemNameSelect, itemNameCustom);
categoryCustom.addEventListener("input", applyRateBookSuggestion);

function getSelectedValue(select, customInput) {
  if (select.value === "__custom__") {
    return customInput.value.trim();
  }
  return select.value;
}

/* ESTIMATE NUMBER */
function generateEstimateNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);
  return `GCE-${year}${month}-${random}`;
}

/* LIVE CALCULATION (based on selected Unit) */
function getCalculation() {
  const line = GlassCareCalculations.calculateLine({
    unit: unitDisplay.value,
    quantity: quantity.value,
    rate: rate.value,
    discountPercent: discountPercent.value,
    gstRate: gstRateInput.value,
    height: Number(height.value) || 0,
    width: Number(width.value) || 0,
    thickness: Number(thickness.value) || 0
  });
  return { ...line, qty: line.quantity, itemRate: line.rate, discount: line.discountPercent, h: line.height, w: line.width, area: line.unit === "Sqft" ? line.measure : 0, runningFeet: line.unit === "R.ft" ? line.measure : 0 };
}

/* UPDATE SCREEN */
function updateCalculation() {
  const calc = getCalculation();

  if (calc.unit === "Sqft") {
    originalSize.textContent = calc.h && calc.w ? `${Math.round(calc.h)} × ${Math.round(calc.w)} mm` : "-- × -- mm";
    roundedSize.textContent = calc.h && calc.w ? `${Math.round(calc.h)} × ${Math.round(calc.w)} mm` : "-- × -- mm";
    areaDisplay.textContent = `${calc.area.toFixed(3)} Sqft`;
    document.getElementById("calculationHint").textContent = "Area calculated from exact entered dimensions.";
  } else if (calc.unit === "R.ft") {
    originalSize.textContent = calc.h && calc.w ? `${Math.round(calc.h)} × ${Math.round(calc.w)} mm` : "-- × -- mm";
    roundedSize.textContent = `${calc.runningFeet.toFixed(2)} R.ft`;
    areaDisplay.textContent = `${calc.runningFeet.toFixed(2)} R.ft`;
    document.getElementById("calculationHint").textContent = "Running feet calculated from the entered perimeter.";
  } else if (calc.unit === "Cubic Ft") {
    originalSize.textContent = calc.h && calc.w && calc.thickness ? `${calc.h} × ${calc.w} × ${calc.thickness} mm` : "Length × width × thickness required";
    roundedSize.textContent = calc.measureLabel;
    areaDisplay.textContent = calc.measureLabel;
    document.getElementById("calculationHint").textContent = "Cubic feet uses length × width × thickness in mm.";
  } else {
    originalSize.textContent = "Not required";
    roundedSize.textContent = "Not applicable";
    areaDisplay.textContent = `${calc.qty} ${calc.unit}`;
    document.getElementById("calculationHint").textContent = "Quantity × rate, less discount.";
  }

  if (calc.errors.length) document.getElementById("calculationHint").textContent = calc.errors[0];

  amountDisplay.textContent = formatMoney(calc.amount);
}

/* ADD ITEM */
document.getElementById("addItem").addEventListener("click", function () {
  const categoryValue = getSelectedValue(categorySelect, categoryCustom);
  const itemNameValue = getSelectedValue(itemNameSelect, itemNameCustom);
  if (!categoryValue) {
    alert("Please select or type a Product Category.");
    return;
  }

  const calc = getCalculation();
  if (calc.unit === "Sqft" && (!calc.h || !calc.w)) {
    alert("Please enter Height and Width for a Sqft item.");
    return;
  }
  if (calc.unit === "R.ft" && (!calc.h || !calc.w)) {
    alert("Please enter Height and Width for an R.ft item.");
    return;
  }
  if (calc.unit === "Cubic Ft" && (!calc.h || !calc.w || !calc.thickness)) {
    alert("Enter length, width and thickness/depth in mm for a Cubic Ft item.");
    return;
  }
  if (calc.errors.length) {
    alert(calc.errors[0]);
    return;
  }
  if (calc.rate < 0 || calc.quantity < 1 || calc.discountPercent < 0 || calc.discountPercent > 100 || calc.gstRate < 0 || calc.gstRate > 100) {
    alert("Check quantity, rate, discount and GST values. Quantity must be at least 1; rates must be non-negative; percentages must be 0–100.");
    return;
  }

  const item = {
    id: Date.now(),
    category: categoryValue,
    itemName: itemNameValue,
    unit: calc.unit,
    height: calc.h,
    width: calc.w,
    thickness: calc.thickness,
    quantity: calc.qty,
    rate: calc.itemRate,
    discountPercent: calc.discount,
    gstRate: calc.gstRate,
    amount: calc.amount
  };

  estimateItems.push(item);
  renderEstimate();
  resetItemForm();
});

/* RESET ADD FORM */
function resetItemForm() {
  categorySelect.value = "";
  categoryCustom.style.display = "none";
  categoryCustom.value = "";
  itemNameSelect.value = "";
  itemNameCustom.style.display = "none";
  itemNameCustom.value = "";
  height.value = "";
  width.value = "";
  thickness.value = "";
  quantity.value = 1;
  rate.value = 0;
  discountPercent.value = 10;
  gstRateInput.value = GST_RATE;
  rate.setAttribute("readonly", "");
  isRateEditing = false;
  editRateBtn.style.display = "block";
  editRateBtn.textContent = "✏️ Edit";
  editRateBtn.style.background = "white";
  editRateBtn.style.color = "#26364d";
  editRateBtn.style.borderColor = "#cbd5e1";
  saveRateBtn.style.display = "none";
  rateSourceTag.textContent = "";
  updateCalculation();
}

/* RECALCULATE A ROW'S AREA/RUNNING-FEET/AMOUNT FROM ITS CURRENT FIELDS */
function recalcItem(item) {
  Object.assign(item, GlassCareCalculations.calculateLine(item));
}

function clearAmountOverrides(item) {
  delete item.taxableAmountOverride;
  delete item.taxAmountOverride;
}

/* RENDER TABLE (every relevant cell is editable in place) */
function renderEstimate() {
  estimateBody.innerHTML = "";

  if (estimateItems.length === 0) {
    estimateBody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align:center;padding:35px;color:#7b8795;">
          No items added yet.
        </td>
      </tr>
    `;
    document.getElementById("itemCount").textContent = "0 items added";
    updateTotals();
    return;
  }

  estimateItems.forEach((item, index) => {
    recalcItem(item);

    const row = document.createElement("tr");
    row.dataset.id = item.id;

    // Category / Item cell
    const catCell = document.createElement("td");
    const catInput = document.createElement("input");
    catInput.className = "cell-edit";
    catInput.value = item.category;
    catInput.addEventListener("change", () => { item.category = catInput.value; updateTotals(); });
    const itemInput = document.createElement("input");
    itemInput.className = "cell-edit item-category";
    itemInput.value = item.itemName || "";
    itemInput.placeholder = "Item name";
    itemInput.addEventListener("change", () => { item.itemName = itemInput.value; updateTotals(); });
    catCell.appendChild(catInput);
    catCell.appendChild(itemInput);
    row.appendChild(catCell);

    // Size cell (only meaningful for Sqft / R.ft)
    const sizeCell = document.createElement("td");
    if (item.unit === "Pcs" || item.unit === "Job") {
      sizeCell.textContent = "-";
    } else {
      const sizeRow = document.createElement("div");
      sizeRow.className = "size-row";
      const hInput = document.createElement("input");
      hInput.type = "number";
      hInput.className = "cell-edit";
      hInput.min = "0";
      hInput.value = item.height;
      hInput.addEventListener("input", () => { item.height = Number(hInput.value) || 0; delete item.measureOverride; clearAmountOverrides(item); recalcItem(item); refreshRowCalcs(row, item); updateTotals(); });
      const xSpan = document.createElement("span");
      xSpan.textContent = "×";
      const wInput = document.createElement("input");
      wInput.type = "number";
      wInput.className = "cell-edit";
      wInput.min = "0";
      wInput.value = item.width;
      wInput.addEventListener("input", () => { item.width = Number(wInput.value) || 0; delete item.measureOverride; clearAmountOverrides(item); recalcItem(item); refreshRowCalcs(row, item); updateTotals(); });
      sizeRow.appendChild(hInput);
      sizeRow.appendChild(xSpan);
      sizeRow.appendChild(wInput);
      if (item.unit === "Cubic Ft") {
        const depthInput = document.createElement("input");
        depthInput.type = "number";
        depthInput.className = "cell-edit";
        depthInput.min = "0";
        depthInput.value = item.thickness || "";
        depthInput.setAttribute("aria-label", "Thickness or depth in millimetres");
        depthInput.addEventListener("input", () => { item.thickness = Number(depthInput.value) || 0; delete item.measureOverride; clearAmountOverrides(item); recalcItem(item); refreshRowCalcs(row, item); updateTotals(); });
        sizeRow.append("×");
        sizeRow.appendChild(depthInput);
      }
      sizeCell.appendChild(sizeRow);
    }
    row.appendChild(sizeCell);

    // Unit cell
    const unitCell = document.createElement("td");
    const unitSelect = document.createElement("select");
    unitSelect.className = "cell-edit";
    ["Sqft", "R.ft", "Cubic Ft", "Pcs", "Job"].forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      if (u === item.unit) opt.selected = true;
      unitSelect.appendChild(opt);
    });
    unitSelect.addEventListener("change", () => {
      item.unit = unitSelect.value;
      delete item.measureOverride;
      clearAmountOverrides(item);
      recalcItem(item);
      renderEstimate();
    });
    unitCell.appendChild(unitSelect);
    row.appendChild(unitCell);

    // Qty cell
    const qtyCell = document.createElement("td");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.className = "cell-edit";
    qtyInput.value = item.quantity;
    qtyInput.addEventListener("input", () => { item.quantity = qtyInput.value === "" ? 0 : Number(qtyInput.value); delete item.measureOverride; clearAmountOverrides(item); recalcItem(item); refreshRowCalcs(row, item); updateTotals(); });
    qtyCell.appendChild(qtyInput);
    row.appendChild(qtyCell);

    // Area / Run Ft cell (auto-calculated, read-only)
    const areaCell = document.createElement("td");
    areaCell.className = "area-cell";
    const measureInput = document.createElement("input");
    measureInput.type = "number";
    measureInput.className = "cell-edit measure-input";
    measureInput.min = "0";
    measureInput.step = "any";
    measureInput.setAttribute("aria-label", "Area, running feet or volume");
    measureInput.addEventListener("input", () => {
      item.measureOverride = Number(measureInput.value);
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    areaCell.appendChild(measureInput);
    row.appendChild(areaCell);

    // Rate cell
    const rateCell = document.createElement("td");
    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.className = "cell-edit";
    rateInput.min = "0";
    rateInput.value = item.rate;
    rateInput.addEventListener("input", () => { item.rate = Number(rateInput.value) || 0; clearAmountOverrides(item); recalcItem(item); refreshRowCalcs(row, item); updateTotals(); });
    rateCell.appendChild(rateInput);
    row.appendChild(rateCell);

    // Per-item percentage discount
    const discountCell = document.createElement("td");
    const discountInput = document.createElement("input");
    discountInput.type = "number";
    discountInput.className = "cell-edit";
    discountInput.min = "0";
    discountInput.max = "100";
    discountInput.step = "0.01";
    discountInput.value = item.discountPercent ?? 10;
    discountInput.addEventListener("input", () => {
      item.discountPercent = Math.min(100, Math.max(0, Number(discountInput.value) || 0));
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    discountCell.appendChild(discountInput);
    row.appendChild(discountCell);

    const gstCell = document.createElement("td");
    const gstInput = document.createElement("input");
    gstInput.type = "number";
    gstInput.className = "cell-edit";
    gstInput.min = "0";
    gstInput.max = "100";
    gstInput.step = "0.01";
    gstInput.value = item.gstRate ?? GST_RATE;
    gstInput.setAttribute("aria-label", "GST rate percent");
    gstInput.addEventListener("input", () => {
      item.gstRate = Number(gstInput.value) || 0;
      delete item.taxAmountOverride;
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    gstCell.appendChild(gstInput);
    row.appendChild(gstCell);

    // Amount cell (auto-calculated, read-only)
    const amountCell = document.createElement("td");
    amountCell.className = "amount amount-cell";
    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.className = "cell-edit taxable-amount-input";
    amountInput.min = "0";
    amountInput.step = "0.01";
    amountInput.setAttribute("aria-label", "Taxable amount in rupees");
    amountInput.addEventListener("input", () => {
      item.taxableAmountOverride = Number(amountInput.value);
      delete item.taxAmountOverride;
      recalcItem(item);
      discountInput.value = Number(item.discountPercent || 0).toFixed(2);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    row.appendChild(amountCell);
    amountCell.appendChild(amountInput);

    const taxAmountCell = document.createElement("td");
    taxAmountCell.className = "tax-amount-cell";
    const taxAmountInput = document.createElement("input");
    taxAmountInput.type = "number";
    taxAmountInput.className = "cell-edit tax-amount-input";
    taxAmountInput.min = "0";
    taxAmountInput.step = "0.01";
    taxAmountInput.setAttribute("aria-label", "Tax amount in rupees");
    taxAmountInput.addEventListener("input", () => {
      item.taxAmountOverride = Number(taxAmountInput.value);
      recalcItem(item);
      gstInput.value = Number(item.gstRate || 0).toFixed(2);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    taxAmountCell.appendChild(taxAmountInput);
    row.insertBefore(taxAmountCell, amountCell);

    // Action cell
    const actionCell = document.createElement("td");
    actionCell.className = "action-cell";
    const editBtn = document.createElement("button");
    editBtn.className = "row-edit-btn";
    editBtn.textContent = "Edit";
    const saveBtn = document.createElement("button");
    saveBtn.className = "row-save-btn";
    saveBtn.textContent = "Save";
    saveBtn.hidden = true;
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "row-cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.hidden = true;
    const rowFields = [...row.querySelectorAll("input, select")];
    rowFields.forEach(field => { field.disabled = true; });
    editBtn.addEventListener("click", () => {
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
      rowFields.forEach(field => { if (!field.classList.contains("amount-cell")) field.disabled = false; });
    });
    saveBtn.addEventListener("click", () => {
      recalcItem(item);
      if (item.errors?.length) {
        alert(`Please correct this item: ${item.errors[0]}`);
        return;
      }
      delete item.factory;
      delete item.vendor;
      renderEstimate();
    });
    cancelBtn.addEventListener("click", () => {
      const itemIndex = estimateItems.findIndex(savedItem => savedItem.id === item.id);
      if (itemIndex !== -1 && row.dataset.original) {
        estimateItems[itemIndex] = JSON.parse(row.dataset.original);
      }
      renderEstimate();
    });
    row.dataset.original = JSON.stringify({ ...item });
    actionCell.append(editBtn, saveBtn, cancelBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.addEventListener("click", () => deleteItem(item.id));
    actionCell.appendChild(deleteBtn);
    const rowError = document.createElement("span");
    rowError.className = "row-error";
    rowError.setAttribute("role", "alert");
    actionCell.appendChild(rowError);
    row.appendChild(actionCell);

    // number cell prepended
    const numCell = document.createElement("td");
    numCell.textContent = index + 1;
    row.insertBefore(numCell, row.firstChild);

    estimateBody.appendChild(row);
    refreshRowCalcs(row, item);
  });

  document.getElementById("itemCount").textContent =
    `${estimateItems.length} item${estimateItems.length === 1 ? "" : "s"} added`;
  updateTotals();
}

/* Update the read-only Area and Amount cells of a row without a full re-render */
function refreshRowCalcs(row, item) {
  const areaCell = row.querySelector(".area-cell");
  const measureInput = row.querySelector(".measure-input");
  const amountCell = row.querySelector(".amount-cell");
  const taxAmountInput = row.querySelector(".tax-amount-input");
  const amountInput = row.querySelector(".taxable-amount-input");
  if (document.activeElement !== measureInput) measureInput.value = Number(item.measure || 0);
  measureInput.title = item.measureLabel;
  measureInput.disabled = ["Pcs", "Job"].includes(item.unit);
  if (document.activeElement !== amountInput) amountInput.value = Number(item.taxableAmount || 0);
  if (document.activeElement !== taxAmountInput) taxAmountInput.value = Number(item.taxAmount || 0);
  const rowError = row.querySelector(".row-error");
  if (rowError) rowError.textContent = (item.errors || []).join(" ");
}

/* DELETE */
function deleteItem(id) {
  estimateItems = estimateItems.filter(item => item.id !== id);
  renderEstimate();
}

/* CLEAR */
document.getElementById("clearAll").addEventListener("click", function () {
  if (estimateItems.length === 0) return;
  if (confirm("Clear all items from this estimate?")) {
    estimateItems = [];
    renderEstimate();
  }
});

/* TOTALS */
function updateTotals() {
  estimateItems.forEach(recalcItem);
  const totals = GlassCareCalculations.calculateTotals(estimateItems, customerState.value);
  document.getElementById("grossSubtotal").textContent = formatMoney(totals.grossSubtotal);
  document.getElementById("totalDiscount").textContent = `− ${formatMoney(totals.discountTotal)}`;
  subtotalDisplay.textContent = formatMoney(totals.subtotal);
  taxBreakdownRows.replaceChildren(...totals.taxBreakdown.flatMap(group => {
    const rate = group.rate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const rows = customerState.value === "Karnataka"
      ? [[`CGST (${(group.rate / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%)`, group.taxAmount / 2], [`SGST (${(group.rate / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%)`, group.taxAmount / 2]]
      : [[`IGST (${rate}%)`, group.taxAmount]];
    return rows.map(([label, amount]) => {
      const row = document.createElement("div");
      row.className = "summary-row";
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("strong");
      value.textContent = formatMoney(amount);
      row.append(name, value);
      return row;
    });
  }));
  document.getElementById("roundOff").textContent = formatMoney(totals.roundOff);
  grandTotalDisplay.textContent = formatMoney(totals.payable, 0);
  amountWords.textContent = numberToWords(totals.payable) + " Only";
  try { localStorage.setItem("glassCareEstimate", JSON.stringify(estimateItems)); } catch { /* storage may be disabled */ }
  persistDraft();
}

/* MONEY FORMAT */
function formatMoney(value) {
  return GlassCareCalculations.formatMoney(value);
}

/* AMOUNT IN WORDS */
function numberToWords(num) {
  if (num === 0) return "Rupees Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return (tens[Math.floor(n / 10)] + " " + ones[n % 10]).trim();
    if (n < 1000) return (ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100)).trim();
    if (n < 100000) return (convert(Math.floor(n / 1000)) + " Thousand " + convert(n % 1000)).trim();
    if (n < 10000000) return (convert(Math.floor(n / 100000)) + " Lakh " + convert(n % 100000)).trim();
    return (convert(Math.floor(n / 10000000)) + " Crore " + convert(n % 10000000)).trim();
  }

  return "Rupees " + convert(num);
}

/* EVENTS */
[height, width, thickness, quantity, rate, discountPercent, gstRateInput, unitDisplay].forEach(el =>
  el.addEventListener("input", updateCalculation)
);
customerState.addEventListener("change", () => { updateTotals(); persistDraft(); });
document.getElementById("estimateDate").addEventListener("change", persistDraft);


/* START */
initialize();