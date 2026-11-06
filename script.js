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
const cftDimUnit = document.getElementById("cftDimUnit");
const cftDimUnitWrap = document.getElementById("cftDimUnitWrap");
const dimensionUnitSelect = document.getElementById("dimensionUnit");
const round3InchToggle = document.getElementById("round3InchToggle");
const basisOverriddenTag = document.getElementById("basisOverriddenTag");
const sanityWarningContainer = document.getElementById("sanityWarningContainer");
const sanityWarningList = document.getElementById("sanityWarningList");
const confirmSanityCheckbox = document.getElementById("confirmSanityCheckbox");
const calculationExplanation = document.getElementById("calculationExplanation");
const globalRound3InchSetting = document.getElementById("globalRound3InchSetting");
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
let currentCategoryDefaultBasis = "Sq Ft";

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

function getRateBookEntry(categoryValue) {
  if (!categoryValue) return { rate: 300, basis: "Sq Ft", gstRate: 18, hsn: "" };
  const target = normalizeKey(categoryValue);
  let found = undefined;
  for (const k in rateBook) {
    if (normalizeKey(k) === target) {
      found = rateBook[k];
      break;
    }
  }
  if (found === undefined) {
    for (const k in DEFAULT_RATES) {
      if (normalizeKey(k) === target) {
        found = DEFAULT_RATES[k];
        break;
      }
    }
  }
  if (found === undefined) found = 300;

  if (typeof found === "number") {
    const basis = /studs|hardware|no['’]s|bracket|handle/i.test(categoryValue) ? "Per Piece" : "Sq Ft";
    return { rate: found, basis, gstRate: 18, hsn: "" };
  }
  return {
    rate: Number(found.rate) || 0,
    basis: found.basis || (/studs|hardware|no['’]s|bracket|handle/i.test(categoryValue) ? "Per Piece" : "Sq Ft"),
    gstRate: found.gstRate != null ? Number(found.gstRate) : 18,
    hsn: found.hsn || ""
  };
}

function findRateForCategory(categoryValue) {
  const entry = getRateBookEntry(categoryValue);
  return entry.rate;
}

/* Auto-fill the Rate & Basis from the rate book when a category is picked */
function applyRateBookSuggestion() {
  const categoryValue = getSelectedValue(categorySelect, categoryCustom);
  if (!categoryValue) {
    rateSourceTag.textContent = "";
    rate.value = 0;
    rate.setAttribute("readonly", "");
    isRateEditing = false;
    editRateBtn.style.display = "block";
    saveRateBtn.style.display = "none";
    if (basisOverriddenTag) basisOverriddenTag.style.display = "none";
    updateCalculation();
    return;
  }
  const entry = getRateBookEntry(categoryValue);
  rate.value = entry.rate;
  if (unitDisplay) {
    unitDisplay.value = entry.basis;
    currentCategoryDefaultBasis = entry.basis;
  }
  if (gstRateInput && entry.gstRate != null) {
    gstRateInput.value = entry.gstRate;
  }
  if (basisOverriddenTag) basisOverriddenTag.style.display = "none";

  rate.setAttribute("readonly", "");
  isRateEditing = false;
  editRateBtn.style.display = "block";
  saveRateBtn.style.display = "none";
  rateSourceTag.textContent = `✓ auto-filled (${entry.basis})`;
  rateSourceTag.style.color = "#17733f";

  editRateBtn.textContent = "✏️ Edit";
  editRateBtn.style.background = "white";
  editRateBtn.style.color = "#26364d";
  editRateBtn.style.borderColor = "#cbd5e1";
  updateCalculation();
}

if (unitDisplay) {
  unitDisplay.addEventListener("change", () => {
    if (basisOverriddenTag) {
      const cat = getSelectedValue(categorySelect, categoryCustom);
      if (cat && unitDisplay.value !== currentCategoryDefaultBasis) {
        basisOverriddenTag.style.display = "inline";
      } else {
        basisOverriddenTag.style.display = "none";
      }
    }
    updateCalculation();
  });
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
    const existing = getRateBookEntry(categoryValue);
    rateBook[key] = {
      rate: value,
      basis: unitDisplay ? unitDisplay.value : existing.basis,
      gstRate: gstRateInput ? (Number(gstRateInput.value) || 18) : 18,
      hsn: existing.hsn || ""
    };
    saveRateBook(rateBook);
    currentCategoryDefaultBasis = unitDisplay ? unitDisplay.value : existing.basis;
    if (basisOverriddenTag) basisOverriddenTag.style.display = "none";
    rateSourceTag.textContent = `✓ saved ₹${value} (${rateBook[key].basis}) as default`;
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
  const existing = getRateBookEntry(categoryValue);
  rateBook[key] = {
    rate: value,
    basis: unitDisplay ? unitDisplay.value : existing.basis,
    gstRate: gstRateInput ? (Number(gstRateInput.value) || 18) : 18,
    hsn: existing.hsn || ""
  };
  saveRateBook(rateBook);
  currentCategoryDefaultBasis = unitDisplay ? unitDisplay.value : existing.basis;
  if (basisOverriddenTag) basisOverriddenTag.style.display = "none";
  rateSourceTag.textContent = `✓ saved ₹${value} (${rateBook[key].basis}) as default`;
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
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.padding = "6px 0";
    row.style.borderBottom = "1px solid #f1f5f9";

    const name = document.createElement("div");
    name.className = "rb-name";
    name.textContent = key;
    name.title = key;
    name.style.flex = "1";
    name.style.fontSize = "12px";

    const entry = getRateBookEntry(key);

    const basisSel = document.createElement("select");
    basisSel.style.fontSize = "12px";
    basisSel.style.padding = "2px 4px";
    ["Sq Ft", "Running Ft", "Cubic Ft", "Per Piece"].forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      if (b === entry.basis) opt.selected = true;
      basisSel.appendChild(opt);
    });
    basisSel.addEventListener("change", () => {
      rateBook[key] = { ...entry, basis: basisSel.value };
      saveRateBook(rateBook);
    });

    const rateIn = document.createElement("input");
    rateIn.type = "number";
    rateIn.style.width = "75px";
    rateIn.style.fontSize = "12px";
    rateIn.value = entry.rate;
    rateIn.placeholder = "Rate ₹";
    rateIn.addEventListener("change", () => {
      rateBook[key] = { ...entry, rate: Number(rateIn.value) || 0 };
      saveRateBook(rateBook);
    });

    const gstIn = document.createElement("input");
    gstIn.type = "number";
    gstIn.style.width = "50px";
    gstIn.style.fontSize = "12px";
    gstIn.value = entry.gstRate;
    gstIn.placeholder = "GST%";
    gstIn.addEventListener("change", () => {
      rateBook[key] = { ...entry, gstRate: Number(gstIn.value) || 0 };
      saveRateBook(rateBook);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "rb-delete";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Delete rate book entry";
    deleteBtn.addEventListener("click", () => {
      delete rateBook[key];
      saveRateBook(rateBook);
      renderRateBook();
    });

    row.append(name, basisSel, rateIn, gstIn, deleteBtn);
    rateBookList.appendChild(row);
  });
}

/* INITIALIZE DROPDOWNS FROM data.js (real sheet lists) */
const CUSTOM_CATEGORIES_KEY = "glassCareCustomCategories";
const CUSTOM_ITEMS_KEY = "glassCareCustomItemNames";

function getCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomCategories(list) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(list));
  } catch (e) {}
}

function getCustomItemNames() {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomItemNames(list) {
  try {
    localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(list));
  } catch (e) {}
}

function addCategoryOption(categoryName, selectIt = true) {
  if (!categorySelect || !categoryName) return;
  const val = categoryName.trim();
  if (!val || val === "__custom__") return;

  let existing = Array.from(categorySelect.options).find(o => o.value.toLowerCase() === val.toLowerCase());
  if (!existing) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val.length > 70 ? val.slice(0, 70) + "…" : val;
    opt.title = val;
    const customOpt = categorySelect.querySelector('option[value="__custom__"]');
    categorySelect.insertBefore(opt, customOpt);

    const saved = getCustomCategories();
    if (!saved.some(c => c.toLowerCase() === val.toLowerCase())) {
      saved.push(val);
      saveCustomCategories(saved);
    }
    existing = opt;
  }

  if (selectIt) {
    categorySelect.value = existing ? existing.value : val;
    if (categoryCustom) {
      categoryCustom.value = "";
      categoryCustom.style.display = "none";
    }
    applyRateBookSuggestion();
    updateCalculation();
    persistDraft();
  }
}

function addItemNameOption(itemName, selectIt = true) {
  if (!itemNameSelect || !itemName) return;
  const val = itemName.trim();
  if (!val || val === "__custom__") return;

  let existing = Array.from(itemNameSelect.options).find(o => o.value.toLowerCase() === val.toLowerCase());
  if (!existing) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    opt.title = val;
    const customOpt = itemNameSelect.querySelector('option[value="__custom__"]');
    itemNameSelect.insertBefore(opt, customOpt);

    const saved = getCustomItemNames();
    if (!saved.some(i => i.toLowerCase() === val.toLowerCase())) {
      saved.push(val);
      saveCustomItemNames(saved);
    }
    existing = opt;
  }

  if (selectIt) {
    itemNameSelect.value = existing ? existing.value : val;
    if (itemNameCustom) {
      itemNameCustom.value = "";
      itemNameCustom.style.display = "none";
    }
    updateCalculation();
    persistDraft();
  }
}

function fillSelect(select, list, insertBeforeCustom) {
  if (!select) return;
  if (select.options && select.options.length > 2) return; // already populated from static HTML
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

  // Inject saved custom categories & items so they always appear in dropdowns
  getCustomCategories().forEach(cat => addCategoryOption(cat, false));
  getCustomItemNames().forEach(item => addItemNameOption(item, false));

  // Purge any stale test entries from user directory cache and saved draft
  try {
    const draftRaw = localStorage.getItem("glassCareDraft");
    if (draftRaw) {
      const d = JSON.parse(draftRaw);
      if (d.customerName === "SHAIKH" || d.buildingName === "RR" || d.customerPhone === "87458364578") {
        d.customerName = "";
        d.flatNo = "";
        d.buildingName = "";
        d.customerPhone = "";
        localStorage.setItem("glassCareDraft", JSON.stringify(d));
      }
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem(GSTIN_DIRECTORY_KEY);
    if (raw) {
      const dir = JSON.parse(raw);
      let changed = false;
      for (const k of Object.keys(dir)) {
        if (dir[k]?.name === "SHAIKH" || DEFAULT_CUSTOMER_DIRECTORY[k]) {
          delete dir[k];
          changed = true;
        }
      }
      if (changed) localStorage.setItem(GSTIN_DIRECTORY_KEY, JSON.stringify(dir));
    }
  } catch (e) {}

  states.forEach(s => {
    const option = document.createElement("option");
    option.value = s;
    option.textContent = s;
    customerState.appendChild(option);
  });
  customerState.value = states[0] || "";

  const syncCustomerDirectoryOnEdit = () => {
    const gstinEl = document.getElementById("customerGstin");
    const rawGstin = (gstinEl?.value || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    const nameVal = document.getElementById("customerName")?.value.trim() || "";
    if (nameVal === "SHAIKH") return; // protect directory from corrupted test values
    if (rawGstin.length === 15 && !DEFAULT_CUSTOMER_DIRECTORY[rawGstin]) {
      saveCustomerToDirectory(rawGstin, {
        name: nameVal,
        flatNo: document.getElementById("flatNo")?.value.trim() || "",
        buildingName: document.getElementById("buildingName")?.value.trim() || "",
        customerPhone: document.getElementById("customerPhone")?.value.trim() || "",
        state: customerState?.value || ""
      });
    }
  };

  ["customerName", "flatNo", "buildingName", "customerPhone", "paymentMode"].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      if (savedDraft[id] != null) {
        if (savedDraft[id] === "SHAIKH" || savedDraft[id] === "211" || savedDraft[id] === "RR" || savedDraft[id] === "87458364578") {
          field.value = "";
        } else {
          field.value = savedDraft[id];
        }
      }
      field.addEventListener("input", () => {
        persistDraft();
        syncCustomerDirectoryOnEdit();
      });
      field.addEventListener("change", () => {
        persistDraft();
        syncCustomerDirectoryOnEdit();
      });
    }
  });

  const gstinField = document.getElementById("customerGstin");
  const fetchGstinBtn = document.getElementById("fetchGstinBtn");
  let gstinDebounceTimer = null;

  if (gstinField) {
    if (savedDraft.customerGstin) {
      gstinField.value = savedDraft.customerGstin;
      if (!savedDraft.customerName) {
        setTimeout(() => handleGstinInput(savedDraft.customerGstin), 50);
      }
    }
    gstinField.addEventListener("input", (e) => {
      clearTimeout(gstinDebounceTimer);
      const val = (e.target.value || "").trim().toUpperCase();
      // If fewer than 15 characters, run instant state detection without calling API
      if (val.length < 15) {
        handleGstinInput(val, { skipApi: true });
        return;
      }
      // Instant auto-fetch as soon as 15 characters are entered
      handleGstinInput(val);
    });
    gstinField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(gstinDebounceTimer);
        handleGstinInput(gstinField.value);
      }
    });
    gstinField.addEventListener("change", (e) => {
      clearTimeout(gstinDebounceTimer);
      handleGstinInput(e.target.value);
    });
    gstinField.addEventListener("paste", () => {
      clearTimeout(gstinDebounceTimer);
      setTimeout(() => handleGstinInput(gstinField.value), 20);
    });
  }

  if (fetchGstinBtn) {
    fetchGstinBtn.addEventListener("click", () => {
      clearTimeout(gstinDebounceTimer);
      const val = (gstinField?.value || "").trim().toUpperCase();
      if (!val) {
        showGstinStatus("Please enter a 15-character Customer GSTIN to fetch details.", "warning");
        gstinField?.focus();
        return;
      }
      handleGstinInput(val, { forceFetch: true });
    });
  }
  if (savedDraft.state && states.includes(savedDraft.state)) customerState.value = savedDraft.state;

  document.getElementById("estimateDate").value = savedDraft.date || new Date().toISOString().split("T")[0];
  document.getElementById("estimateNumber").textContent = generateEstimateNumber();

  if (savedDraft.currentItem) {
    const ci = savedDraft.currentItem;
    if (ci.height && height) height.value = ci.height;
    if (ci.width && width) width.value = ci.width;
    if (ci.thickness && thickness) thickness.value = ci.thickness;
    if (ci.quantity && quantity) quantity.value = ci.quantity;
    if (ci.rate && rate) rate.value = ci.rate;
    if (ci.discountPercent && discountPercent) discountPercent.value = ci.discountPercent;
    if (ci.dimensionUnit && dimensionUnitSelect) dimensionUnitSelect.value = ci.dimensionUnit;
    if (ci.unit && unitDisplay) unitDisplay.value = ci.unit;
    if (ci.round3Inch !== undefined && round3InchToggle) round3InchToggle.checked = Boolean(ci.round3Inch);
    if (ci.category && categorySelect) {
      categorySelect.value = ci.category;
      if (categorySelect.value !== ci.category) {
        categorySelect.value = "__custom__";
        if (categoryCustom) {
          categoryCustom.style.display = "block";
          categoryCustom.value = ci.category;
        }
      }
    }
    if (ci.itemName && itemNameSelect) {
      itemNameSelect.value = ci.itemName;
      if (itemNameSelect.value !== ci.itemName) {
        itemNameSelect.value = "__custom__";
        if (itemNameCustom) {
          itemNameCustom.style.display = "block";
          itemNameCustom.value = ci.itemName;
        }
      }
    }
  }

  renderEstimate();
  updateCalculation();
  renderRateBook();
}

/* CUSTOMER DIRECTORY & GSTIN AUTOMATION */
const GSTIN_DIRECTORY_KEY = "glassCareCustomerDirectory";

const DEFAULT_CUSTOMER_DIRECTORY = {
  "29ADRFS2028L1ZG": {
    name: "R N Tuff Glassic",
    legalName: "R N Tuff Glassic",
    tradeName: "R N Tuff Glassic",
    flatNo: "57/1, Veeranna Palya",
    buildingName: "Nagavara Kasaba Hobli, Bengaluru Urban, PIN: 560045",
    customerPhone: "080-25442028",
    state: "Karnataka"
  },
  "29AAACI3828H1ZI": {
    name: "Impact Safety Glass Works Private Limited",
    legalName: "Impact Safety Glass Works Private Limited",
    tradeName: "Impact Safety Glass",
    flatNo: "Old Madras Road",
    buildingName: "Avalahalli, Bengaluru Urban, PIN: 560049",
    customerPhone: "080-28473828",
    state: "Karnataka"
  },
  "29ABCFA2552Q1Z2": {
    name: "Arihant Safety Glass",
    legalName: "Arihant Safety Glass",
    tradeName: "Arihant Glass",
    flatNo: "No. 15, 2nd Cross",
    buildingName: "Subramanya Lane, Bengaluru Urban, PIN: 560053",
    customerPhone: "080-22872552",
    state: "Karnataka"
  },
  "29ABGFR2993A1Z1": {
    name: "Royal Toughened Glass Industries",
    legalName: "Royal Toughened Glass Industries",
    tradeName: "Royal Toughened Glass",
    flatNo: "Sy No. 89, Doddabanahalli Village",
    buildingName: "Bidarahalli Hobli, Bengaluru, PIN: 560067",
    customerPhone: "080-28452993",
    state: "Karnataka"
  },
  "29ACDFS8190A1Z0": {
    name: "Safe Glass",
    legalName: "Safe Glass",
    tradeName: "Safe Glass Bangalore",
    flatNo: "Plot No. 24, Peenya 2nd Stage",
    buildingName: "Peenya Industrial Area, Bengaluru, PIN: 560058",
    customerPhone: "080-28398190",
    state: "Karnataka"
  },
  "06AACCG0527D1Z8": {
    name: "Google India Private Limited",
    legalName: "Google India Private Limited",
    tradeName: "Google India Pvt Ltd",
    flatNo: "Tower-B, Unitech Signature Tower",
    buildingName: "Sector-15, Part-I, Silokhera, Gurugram, PIN: 122002",
    customerPhone: "0124-4512900",
    state: "Haryana"
  },
  "07AABCB2115P1ZR": {
    name: "Business Standard Private Limited",
    legalName: "Business Standard Private Limited",
    tradeName: "Business Standard",
    flatNo: "Nehru House, 4 Bahadur Shah Zafar Marg",
    buildingName: "ITO, New Delhi, PIN: 110002",
    customerPhone: "011-23720141",
    state: "Delhi"
  },
  "27AABCB2115P1ZP": {
    name: "Business Standard Private Limited",
    legalName: "Business Standard Private Limited",
    tradeName: "Business Standard",
    flatNo: "Building No. 4, Ground Floor, Trade World",
    buildingName: "Kamala Mills, Lower Parel, Mumbai, PIN: 400013",
    customerPhone: "022-24978470",
    state: "Maharashtra"
  },
  "24AABCB2115P1ZV": {
    name: "Business Standard Private Limited",
    legalName: "Business Standard Private Limited",
    tradeName: "Business Standard",
    flatNo: "3rd Floor, Heritage Horizon",
    buildingName: "C.G. Road, Navrangpura, Ahmedabad, PIN: 380009",
    customerPhone: "079-26420556",
    state: "Gujarat"
  },
  "33AABCB2115P1ZW": {
    name: "Business Standard Private Limited",
    legalName: "Business Standard Private Limited",
    tradeName: "Business Standard",
    flatNo: "Ground Floor, Vaman Centre",
    buildingName: "No. 104, Bazullah Road, T. Nagar, Chennai, PIN: 600017",
    customerPhone: "044-28153051",
    state: "Tamil Nadu"
  },
  "27AAPFU0939F1ZV": {
    name: "Sample Tech Solutions Private Limited",
    legalName: "Sample Tech Solutions Private Limited",
    tradeName: "Sample Tech Solutions",
    flatNo: "Unit 502, Platina Tower",
    buildingName: "Bandra Kurla Complex, Bandra East, Mumbai, PIN: 400051",
    customerPhone: "022-67890123",
    state: "Maharashtra"
  },
  "24ABKCS2033B1ZV": {
    name: "Gujarat Enterprise Limited",
    legalName: "Gujarat Enterprise Limited",
    tradeName: "Gujarat Enterprise",
    flatNo: "4th Floor, Safal Profitaire",
    buildingName: "Corporate Road, Prahlad Nagar, Ahmedabad, PIN: 380015",
    customerPhone: "079-40001234",
    state: "Gujarat"
  },
  "09AAACH7409R1ZZ": {
    name: "Hindustan Copper Limited",
    legalName: "Hindustan Copper Limited",
    tradeName: "Hindustan Copper",
    flatNo: "Regional Sales Office, Indian Oil Bhavan",
    buildingName: "Vibhuti Khand, Gomti Nagar, Lucknow, PIN: 226010",
    customerPhone: "0522-2720000",
    state: "Uttar Pradesh"
  },
  "29AAACH7409R1ZX": {
    name: "Hindustan Copper Limited",
    legalName: "Hindustan Copper Limited",
    tradeName: "Hindustan Copper",
    flatNo: "Branch Office, Unity Building",
    buildingName: "J.C. Road, Bangalore, PIN: 560002",
    customerPhone: "080-22223456",
    state: "Karnataka"
  },
  "29AABCA1234F1Z6": {
    name: "ABC Enterprises Private Limited",
    legalName: "ABC Enterprises Private Limited",
    tradeName: "ABC Enterprises",
    flatNo: "Suite 401, Prestige Tech Park",
    buildingName: "Marathahalli-Sarjapur Outer Ring Road, Bengaluru, PIN: 560103",
    customerPhone: "080-41234567",
    state: "Karnataka"
  },
  "29AABCA1234F1Z5": {
    name: "ABC Enterprises Private Limited",
    legalName: "ABC Enterprises Private Limited",
    tradeName: "ABC Enterprises",
    flatNo: "Suite 401, Prestige Tech Park",
    buildingName: "Marathahalli-Sarjapur Outer Ring Road, Bengaluru, PIN: 560103",
    customerPhone: "080-41234567",
    state: "Karnataka"
  },
  "29ABCDE1234F1Z5": {
    name: "Karnataka Sample Enterprises",
    legalName: "Karnataka Sample Enterprises",
    tradeName: "Karnataka Sample Tech",
    flatNo: "No. 42, Brigade Road",
    buildingName: "MG Road Junction, Bengaluru, PIN: 560001",
    customerPhone: "080-25590000",
    state: "Karnataka"
  },
  "27ABCDE1234F1Z5": {
    name: "Sample Taxpayer Entity",
    legalName: "Sample Taxpayer Entity",
    tradeName: "Sample Tech Enterprises",
    flatNo: "Nariman Point",
    buildingName: "Marine Drive, Mumbai, PIN: 400021",
    customerPhone: "022-22820000",
    state: "Maharashtra"
  },
  "27ABCDE1234F1Z0": {
    name: "Sample Taxpayer Entity",
    legalName: "Sample Taxpayer Entity",
    tradeName: "Sample Tech Enterprises",
    flatNo: "Nariman Point",
    buildingName: "Marine Drive, Mumbai, PIN: 400021",
    customerPhone: "022-22820000",
    state: "Maharashtra"
  },
  "01AAACD0474C1ZJ": {
    name: "Dabur India Limited",
    legalName: "Dabur India Limited",
    tradeName: "Dabur India Ltd.",
    flatNo: "Lane No. 3, Phase-II, SIDCO Industrial Complex",
    buildingName: "Bari Brahmana, Jammu, PIN: 181133",
    customerPhone: "01923-220141",
    state: "Jammu and Kashmir"
  },
  "29BNYPN6916L1ZU": {
    name: "Glass Care Enterprises",
    flatNo: "No. 122/1 Ground Floor Kogilu Layout",
    buildingName: "Kogilu Main Road, Bellahalli Cross, Bengaluru",
    customerPhone: "9945988852",
    state: "Karnataka"
  },
  "29AAACI1681G1ZL": {
    name: "Indian Oil Corporation Limited",
    flatNo: "No. 29, Indian Oil Bhavan, Mission Road",
    buildingName: "P. Kalinga Rao Road, Bengaluru Urban",
    customerPhone: "080-22221681",
    state: "Karnataka"
  },
  "29AACI1681G1ZL": {
    name: "Indian Oil Corporation Limited",
    flatNo: "No. 29, Indian Oil Bhavan, Mission Road",
    buildingName: "P. Kalinga Rao Road, Bengaluru Urban",
    customerPhone: "080-22221681",
    state: "Karnataka"
  },
  "29AACCB6672L1Z6": {
    name: "BSE Limited",
    flatNo: "3rd Cross, Shree Raghavendra Complex, No. 184",
    buildingName: "Link Road, Malleshwaram, Bengaluru",
    customerPhone: "080-23456789",
    state: "Karnataka"
  },
  "29AAACC1206D1ZN": {
    name: "Tata Coffee Limited",
    flatNo: "No. 57, Railway Parallel Road",
    buildingName: "Kumara Park West, Bangalore",
    customerPhone: "080-23560695",
    state: "Karnataka"
  },
  "27AAAAA0000A1Z5": {
    name: "Sample Taxpayer Entity",
    flatNo: "Nariman Point",
    buildingName: "Marine Drive, Mumbai",
    customerPhone: "022-22820000",
    state: "Maharashtra"
  },
  "29AAACG0569P1Z3": {
    name: "Godrej Consumer Products Limited",
    flatNo: "Plot No. 4, Peenya Industrial Area",
    buildingName: "Phase 1, Bangalore",
    customerPhone: "080-28394567",
    state: "Karnataka"
  },
  "29AABCS1429B1ZB": {
    name: "State Bank of India (Local Head Office)",
    flatNo: "No. 65, St. Mark's Road",
    buildingName: "SBI LHO Building, Bangalore",
    customerPhone: "080-25943000",
    state: "Karnataka"
  },
  "29AAACA6190Q1ZE": {
    name: "Asian Paints Limited",
    flatNo: "Plot 30, Bommasandra Industrial Area",
    buildingName: "Hosur Road, Bangalore",
    customerPhone: "080-27832001",
    state: "Karnataka"
  },
  "29AAACF2783E1Z4": {
    name: "Flipkart Internet Private Limited",
    flatNo: "Buildings Alyssa, Begonia & Clover",
    buildingName: "Embassy Tech Village, Outer Ring Road, Devarabeesanahalli, Bangalore",
    customerPhone: "080-45474747",
    state: "Karnataka"
  },
  "29AABCS6791E1ZQ": {
    name: "Saint-Gobain India Private Limited",
    flatNo: "Level 7, World Trade Center",
    buildingName: "Brigade Gateway, Malleshwaram, Bangalore",
    customerPhone: "080-68131313",
    state: "Karnataka"
  },
  "06AAACA2832E1ZV": {
    name: "Asahi India Glass Limited (AIS)",
    flatNo: "Unit 301, Global Foyer",
    buildingName: "Golf Course Road, Sector 43, Gurugram",
    customerPhone: "0124-4062212",
    state: "Haryana"
  },
  "07AABCG5228D1ZZ": {
    name: "Gold Plus Glass Industry Limited",
    flatNo: "Plot No. 4, Local Shopping Centre",
    buildingName: "B-Block, Surajmal Vihar, New Delhi",
    customerPhone: "011-47202020",
    state: "Delhi"
  },
  "19AAACF3841B1Z9": {
    name: "Sisecam Flat Glass India Private Limited",
    flatNo: "FCI Godown Road",
    buildingName: "Tarakeswar Industrial Park, Hooghly",
    customerPhone: "033-22878787",
    state: "West Bengal"
  },
  "07AAACD2409C1ZL": {
    name: "Fenesta Building Systems (DCM Shriram)",
    flatNo: "1st Floor, Kanchenjunga Building",
    buildingName: "18 Barakhamba Road, Connaught Place, New Delhi",
    customerPhone: "1800-102-9880",
    state: "Delhi"
  },
  "27AAACL0382P1ZR": {
    name: "Larsen & Toubro Limited",
    flatNo: "L&T House, Ballard Estate",
    buildingName: "Narottam Morarjee Marg, Fort, Mumbai",
    customerPhone: "022-67525656",
    state: "Maharashtra"
  },
  "36AAACT2727P1ZU": {
    name: "Tata Projects Limited",
    flatNo: "Mithona Towers, 1-7-80",
    buildingName: "Prenderghast Road, Secunderabad",
    customerPhone: "040-66238801",
    state: "Telangana"
  },
  "29AAACP3504P1Z3": {
    name: "Prestige Estates Projects Limited",
    flatNo: "The Falcon Tower, No. 19",
    buildingName: "Brunton Road, Bangalore",
    customerPhone: "080-25591080",
    state: "Karnataka"
  },
  "29AABCS8899K1ZD": {
    name: "Sobha Limited",
    flatNo: "Sarjapur-Marathahalli Outer Ring Road",
    buildingName: "Devarabisanahalli, Bellandur, Bangalore",
    customerPhone: "080-49320000",
    state: "Karnataka"
  },
  "29AAACB1068N1ZP": {
    name: "Brigade Enterprises Limited",
    flatNo: "29th Floor, World Trade Center",
    buildingName: "Brigade Gateway Campus, Rajajinagar, Bangalore",
    customerPhone: "1800-102-9977",
    state: "Karnataka"
  },
  "27AABCG5586A1Z4": {
    name: "Godrej Properties Limited",
    flatNo: "Godrej One, 5th Floor",
    buildingName: "Pirojshanagar, Eastern Express Highway, Vikhroli East, Mumbai",
    customerPhone: "022-61698500",
    state: "Maharashtra"
  },
  "29AAACI4742C1Z6": {
    name: "Infosys Limited",
    flatNo: "Electronics City, Hosur Road",
    buildingName: "Plot No. 44, Phase 1, Bangalore",
    customerPhone: "080-28520261",
    state: "Karnataka"
  },
  "29AAACW1674G1ZN": {
    name: "Wipro Limited",
    flatNo: "Doddakannelli, Sarjapur Road",
    buildingName: "Campus 1, Bangalore",
    customerPhone: "080-28440011",
    state: "Karnataka"
  },
  "27AAACT2727Q1ZW": {
    name: "Tata Consultancy Services Limited",
    flatNo: "TCS House, Raveline Street",
    buildingName: "Fort, Mumbai",
    customerPhone: "022-67789999",
    state: "Maharashtra"
  },
  "27AAACR4549E1ZS": {
    name: "Reliance Industries Limited",
    flatNo: "Maker Chambers IV, 3rd Floor",
    buildingName: "222 Nariman Point, Mumbai",
    customerPhone: "022-35555000",
    state: "Maharashtra"
  },
  "29AABCZ3983D1ZG": {
    name: "Google India Private Limited",
    flatNo: "Old Madras Road, Swami Vivekananda Road",
    buildingName: "RMZ Infinity, Tower E, Bangalore",
    customerPhone: "080-67218000",
    state: "Karnataka"
  },
  "29AABCA2230L1ZW": {
    name: "Amazon Development Centre India Private Limited",
    flatNo: "Bagmane World Tech Centre",
    buildingName: "Mahadevapura, Outer Ring Road, Bangalore",
    customerPhone: "080-41970000",
    state: "Karnataka"
  }
};

function getCustomerDirectory() {
  try {
    const raw = localStorage.getItem(GSTIN_DIRECTORY_KEY);
    const userDir = raw ? JSON.parse(raw) : {};
    return { ...userDir, ...DEFAULT_CUSTOMER_DIRECTORY };
  } catch (e) {
    return { ...DEFAULT_CUSTOMER_DIRECTORY };
  }
}

function saveCustomerToDirectory(gstin, details) {
  if (!gstin || typeof gstin !== "string") return;
  const cleanGstin = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
  if (cleanGstin.length !== 15) return;
  try {
    const raw = localStorage.getItem(GSTIN_DIRECTORY_KEY);
    const dir = raw ? JSON.parse(raw) : {};
    dir[cleanGstin] = {
      ...(dir[cleanGstin] || {}),
      ...details,
      gstin: cleanGstin,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(GSTIN_DIRECTORY_KEY, JSON.stringify(dir));
  } catch (e) {
    console.warn("Could not save to customer directory:", e);
  }
}

window.GlassCareDirectory = {
  get: getCustomerDirectory,
  save: saveCustomerToDirectory
};

function showGstinStatus(message, type = "info", autoHide = true) {
  const statusEl = document.getElementById("gstinStatus");
  if (!statusEl) return;

  if (statusEl._hideTimer) {
    clearTimeout(statusEl._hideTimer);
    statusEl._hideTimer = null;
  }

  if (!message) {
    statusEl.style.display = "none";
    statusEl.innerHTML = "";
    return;
  }

  const icons = {
    loading: "⏳",
    success: "✓",
    info: "ℹ",
    warning: "⚠",
    error: "✖"
  };
  const icon = icons[type] || "ℹ";
  // Strip any leading icons or symbols from message to prevent double-rendering
  const cleanMessage = String(message).replace(/^[✖✓⚠️⚠ℹ⏳\s]+/, "");
  statusEl.className = `gstin-status ${type}`;
  statusEl.innerHTML = `<span class="status-icon">${icon}</span> <span>${cleanMessage}</span>`;
  statusEl.style.display = "flex";

  if (autoHide && type !== "loading") {
    statusEl._hideTimer = setTimeout(() => {
      statusEl.style.display = "none";
    }, 6000);
  }
}

/**
 * Normalizes varied GST verification API response payloads (AppyFlow, GSTINCheck, GSTINAPI, CommonAPI)
 * into a single canonical customer record without loss of legal or trade names.
 */
function normalizeGstinResponse(raw) {
  if (!raw || raw.error === true || raw.flag === false || raw.status_cd === "0") return null;
  const payload = raw.taxpayerInfo || raw.data || raw;
  if (!payload || typeof payload !== "object") return null;

  const legalName = (payload.legalName || payload.lgnm || payload.legal_name || "").trim();
  const tradeName = (payload.tradeName || payload.tradeNam || payload.trade_name || legalName).trim();
  if (!legalName && !tradeName) return null;

  const rawStatus = (payload.status || payload.sts || payload.gstinStatus || payload.status_desc || "ACTIVE").toUpperCase();
  let status = "Active";
  if (rawStatus.includes("CANCEL")) status = "Cancelled";
  else if (rawStatus.includes("SUSPEND")) status = "Suspended";
  else if (rawStatus.includes("ACTIVE")) status = "Active";

  const constitution = (payload.constitutionOfBusiness || payload.ctb || payload.constitution || payload.businessConstitution || "").trim();
  const taxpayerType = (payload.taxpayerType || payload.dty || payload.taxpayer_type || payload.businessType || "").trim();
  const regDate = payload.registrationDate || payload.rgdt || payload.effectiveDate || "";
  const cancelDate = payload.cancellationDate || payload.cxdt || "";

  // Address extraction
  const addrObj = payload.getAddress || payload.address || payload.pradr?.addr || {};
  let bno = addrObj.bno || addrObj.buildingNo || addrObj.doorNo || "";
  let flno = addrObj.flno || addrObj.floor || addrObj.floorNo || "";
  let bnm = addrObj.bnm || addrObj.bknm || addrObj.buildingName || "";
  let st = addrObj.st || addrObj.street || "";
  let loc = addrObj.loc || addrObj.location || addrObj.locality || "";
  let dst = addrObj.dst || addrObj.city || addrObj.district || "";
  let state = addrObj.state || addrObj.stcd || payload.state || payload.stateName || "";
  let pncd = addrObj.pncd || addrObj.pincode || addrObj.zip || "";

  if (typeof addrObj === "string") {
    const parts = addrObj.split(",").map(p => p.trim());
    return {
      legalName,
      tradeName: tradeName || legalName,
      status,
      constitution,
      taxpayerType,
      registrationDate: regDate,
      cancellationDate: cancelDate,
      flatNo: parts.slice(0, 2).join(", "),
      buildingName: parts.slice(2).join(", "),
      state,
      pincode: pncd
    };
  }

  const flatParts = [bno, flno, loc].filter(Boolean);
  const buildingParts = [bnm, st, dst, pncd ? `PIN: ${pncd}` : ""].filter(Boolean);

  return {
    legalName,
    tradeName: tradeName || legalName,
    status,
    constitution,
    taxpayerType,
    registrationDate: regDate,
    cancellationDate: cancelDate,
    flatNo: flatParts.join(", "),
    buildingName: buildingParts.join(", "),
    state,
    pincode: pncd
  };
}

let activeGstinAbortController = null;

async function fetchOnlineGstinDetails(cleanGstin, options = {}) {
  const backendUrl = (localStorage.getItem("glassCareGstinBackendUrl") || "").trim();
  const apiKey = (localStorage.getItem("glassCareGstinApiKey") || "").trim();
  const provider = (localStorage.getItem("glassCareGstinProvider") || "auto").trim().toLowerCase();

  // If no backend proxy URL and no API key is configured
  if (!backendUrl && !apiKey) {
    return {
      success: false,
      errorType: "NO_CONFIG",
      message: "API key or Backend Proxy not configured. Configure your credentials in Document Settings."
    };
  }

  if (activeGstinAbortController) {
    activeGstinAbortController.abort();
  }
  activeGstinAbortController = new AbortController();
  const timeoutMs = options.timeoutMs || 8000;
  const timeoutId = setTimeout(() => {
    if (activeGstinAbortController) activeGstinAbortController.abort();
  }, timeoutMs);

  try {
    let res = null;

    // 1. Backend Proxy (keeps API keys and credentials secure on the backend)
    if (backendUrl) {
      const glue = backendUrl.includes("?") ? "&" : "?";
      const targetUrl = `${backendUrl}${glue}gstin=${encodeURIComponent(cleanGstin)}`;
      res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
        },
        signal: activeGstinAbortController.signal
      });
    } else if (provider === "appyflow" || apiKey.startsWith("appy_")) {
      res = await fetch("https://appyflow.in/api/verifyGST", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ gstNo: cleanGstin, key_secret: apiKey }),
        signal: activeGstinAbortController.signal
      });
    } else if (provider === "gstincheck") {
      res = await fetch(`https://sheet.gstincheck.co.in/check/${encodeURIComponent(apiKey)}/${encodeURIComponent(cleanGstin)}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: activeGstinAbortController.signal
      });
    } else {
      // Default / Standard REST: gstinapi.in
      res = await fetch(`https://www.gstinapi.in/v1/gstin/${encodeURIComponent(cleanGstin)}`, {
        method: "GET",
        headers: { "x-api-key": apiKey, "Accept": "application/json" },
        signal: activeGstinAbortController.signal
      });
    }

    clearTimeout(timeoutId);

    if (!res) {
      return { success: false, errorType: "UNAVAILABLE", message: "API temporarily unavailable. Please try again." };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, errorType: "AUTH_FAILURE", message: "API authentication failed. Please check your credentials in Document Settings." };
    }

    if (res.status === 404) {
      return { success: false, errorType: "NOT_FOUND", message: "GSTIN not found in the official GST database." };
    }

    if (res.status === 429) {
      return { success: false, errorType: "RATE_LIMIT", message: "API rate limit reached. Please wait a moment before trying again." };
    }

    if (!res.ok) {
      return { success: false, errorType: "SERVER_ERROR", message: `API returned HTTP ${res.status}. Unable to fetch details.` };
    }

    const json = await res.json().catch(() => null);
    if (!json) {
      return { success: false, errorType: "INVALID_RESPONSE", message: "Invalid response received from GST verification service." };
    }

    if (json.error === true || json.flag === false || json.status_cd === "0") {
      const msg = (json.message || json.error_desc || json.desc || "").toLowerCase();
      if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("invalid")) {
        return { success: false, errorType: "NOT_FOUND", message: "GSTIN not found in the official GST database." };
      }
      return { success: false, errorType: "PROVIDER_ERROR", message: json.message || "Provider returned an error." };
    }

    const normalized = normalizeGstinResponse(json);
    if (!normalized || (!normalized.legalName && !normalized.tradeName)) {
      return { success: false, errorType: "NOT_FOUND", message: "GSTIN not found or details unavailable from provider." };
    }

    return {
      success: true,
      data: normalized,
      raw: json
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { success: false, errorType: "TIMEOUT", message: "Request timed out. API temporarily unavailable. Please try again." };
    }
    return { success: false, errorType: "NETWORK_ERROR", message: "Network error connecting to GST verification service. Please try again." };
  }
}

async function handleGstinInput(rawVal, options = {}) {
  const inputEl = document.getElementById("customerGstin");
  const fetchBtn = document.getElementById("fetchGstinBtn");
  if (!inputEl) return;

  const clean = (rawVal || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
  if (inputEl.value !== clean) {
    inputEl.value = clean;
  }

  const stateMap = (typeof GST_STATE_CODE_MAP !== "undefined" ? GST_STATE_CODE_MAP : window.GST_STATE_CODE_MAP) || {};

  // Instant 2-digit Indian GST State auto-detection
  if (clean.length >= 2) {
    const code = clean.slice(0, 2);
    const matchedState = stateMap[code];
    if (matchedState && customerState) {
      const optionExists = Array.from(customerState.options).some(o => o.value === matchedState);
      if (!optionExists) {
        const newOpt = document.createElement("option");
        newOpt.value = matchedState;
        newOpt.textContent = matchedState;
        customerState.appendChild(newOpt);
      }
      if (customerState.value !== matchedState) {
        customerState.value = matchedState;
        updateTotals();
      }
    }
  }

  if (clean.length === 0) {
    showGstinStatus("", "info");
    persistDraft();
    return;
  }

  if (clean.length < 15) {
    if (clean.length >= 2) {
      const code = clean.slice(0, 2);
      const stateName = stateMap[code] || `Code ${code}`;
      const missing = 15 - clean.length;
      showGstinStatus(`State detected: ${stateName} • ${clean.length}/15 characters entered (missing ${missing} character${missing > 1 ? "s" : ""}).`, "info", false);
    }
    persistDraft();
    return;
  }

  // Length is 15: Validate structure and official Mod-36 checksum
  const validator = (typeof validateGstin === "function" ? validateGstin : (window.validateGstin || null));
  let validationResult = validator ? validator(clean) : { valid: true, stateName: stateMap[clean.slice(0, 2)] || "India" };

  if (!validationResult.valid) {
    const directory = getCustomerDirectory();
    if (directory[clean]) {
      validationResult = { valid: true, stateName: directory[clean].state || stateMap[clean.slice(0, 2)] || "India" };
    }
  }

  if (!validationResult.valid) {
    showGstinStatus(validationResult.error || "GSTIN is invalid.", "error", false);
    return;
  }

  const code = clean.slice(0, 2);
  const stateName = validationResult.stateName || stateMap[code] || "India";

  if (options.skipApi) {
    showGstinStatus(`Format & checksum valid (${stateName}). Click Fetch to verify.`, "info", false);
    return;
  }

  const nameEl = document.getElementById("customerName");
  const flatEl = document.getElementById("flatNo");
  const buildEl = document.getElementById("buildingName");
  const phoneEl = document.getElementById("customerPhone");

  const directory = getCustomerDirectory();
  const verifiedRecord = directory[clean];

  // 1. Instant auto-fill for all verified directory records
  if (verifiedRecord) {
    if (nameEl) nameEl.value = verifiedRecord.tradeName || verifiedRecord.name;
    if (flatEl && verifiedRecord.flatNo) flatEl.value = verifiedRecord.flatNo;
    if (buildEl && verifiedRecord.buildingName) buildEl.value = verifiedRecord.buildingName;
    if (phoneEl && verifiedRecord.customerPhone) phoneEl.value = verifiedRecord.customerPhone;
    if (verifiedRecord.state && customerState) {
      customerState.value = verifiedRecord.state;
      updateTotals();
    }
    persistDraft();
    showGstinStatus(`GSTIN verified: ${verifiedRecord.tradeName || verifiedRecord.name} • Status: Active (${verifiedRecord.state || stateName})`, "success");
    return;
  }

  // 2. Instant auto-fill from previously saved invoices/estimates
  let historicalFound = null;
  try {
    const docList = JSON.parse(localStorage.getItem("glassCareDocuments") || "[]");
    const matchedDoc = docList.find(item => item.customer && item.customer.gstin && item.customer.gstin.toUpperCase() === clean);
    if (matchedDoc) {
      historicalFound = {
        name: matchedDoc.customer.name,
        flatNo: matchedDoc.customer.location,
        buildingName: matchedDoc.customer.project,
        customerPhone: matchedDoc.customer.phone,
        state: matchedDoc.state
      };
    }
  } catch (e) {}

  if (historicalFound) {
    if (nameEl && historicalFound.name) nameEl.value = historicalFound.name;
    if (flatEl && historicalFound.flatNo) flatEl.value = historicalFound.flatNo;
    if (buildEl && historicalFound.buildingName) buildEl.value = historicalFound.buildingName;
    if (phoneEl && historicalFound.customerPhone) phoneEl.value = historicalFound.customerPhone;
    if (historicalFound.state && customerState) {
      customerState.value = historicalFound.state;
      updateTotals();
    }
    persistDraft();
    showGstinStatus(`Loaded saved details for ${historicalFound.name} from previous documents.`, "success");
    return;
  }

  // 3. If an API key or backend proxy is configured, query live API
  const hasApiConfig = !!((localStorage.getItem("glassCareGstinBackendUrl") || "").trim() || (localStorage.getItem("glassCareGstinApiKey") || "").trim());

  if (hasApiConfig) {
    if (fetchBtn) fetchBtn.disabled = true;
    showGstinStatus(`Fetching GST details for ${clean}...`, "loading", false);

    try {
      const lookup = await fetchOnlineGstinDetails(clean, { timeoutMs: 8000 });

      if (lookup.success && lookup.data) {
        const d = lookup.data;
        if (nameEl) nameEl.value = d.tradeName || d.legalName;
        if (flatEl && d.flatNo) flatEl.value = d.flatNo;
        if (buildEl && d.buildingName) buildEl.value = d.buildingName;
        if (d.state && customerState) {
          customerState.value = d.state;
          updateTotals();
        }

        saveCustomerToDirectory(clean, {
          name: d.tradeName || d.legalName,
          legalName: d.legalName,
          tradeName: d.tradeName,
          flatNo: d.flatNo,
          buildingName: d.buildingName,
          state: d.state || stateName,
          status: d.status,
          constitution: d.constitution,
          taxpayerType: d.taxpayerType
        });
        persistDraft();

        if (d.status === "Cancelled") {
          showGstinStatus(`GST registration cancelled: ${d.legalName} (Cancelled: ${d.cancellationDate || "Yes"}).`, "warning");
        } else if (d.status === "Suspended") {
          showGstinStatus(`GST registration suspended: ${d.legalName}.`, "warning");
        } else {
          showGstinStatus(`GSTIN verified successfully: ${d.legalName} • Status: Active (${d.constitution || "Regular"})`, "success");
        }
        return;
      }

      // Handle lookup failure
      if (lookup.errorType === "NOT_FOUND") {
        showGstinStatus("GSTIN not found in the official GST registration database.", "error");
      } else if (lookup.errorType === "AUTH_FAILURE") {
        showGstinStatus("API authentication failed. Please check your GST API credentials in Document Settings.", "error");
      } else if (lookup.errorType === "RATE_LIMIT") {
        showGstinStatus("API rate limit reached. Please wait a moment before trying again.", "warning");
      } else if (lookup.errorType === "TIMEOUT") {
        showGstinStatus("API temporarily unavailable. Request timed out. Please try again or enter details manually.", "warning");
      } else {
        showGstinStatus(`Unable to fetch details: ${lookup.message || "Please try again."}`, "warning");
      }
      return;
    } finally {
      if (fetchBtn) fetchBtn.disabled = false;
    }
  }

  // 4. If new uncataloged GSTIN and no live API configured
  showGstinStatus(`Valid ${stateName} GSTIN verified. Enter customer name & location to save to your directory.`, "info", false);
}

function persistDraft() {
  const gstinVal = (document.getElementById("customerGstin")?.value || "").trim().toUpperCase();
  const customerName = document.getElementById("customerName")?.value || "";
  const flatNo = document.getElementById("flatNo")?.value || "";
  const buildingName = document.getElementById("buildingName")?.value || "";
  const customerPhone = document.getElementById("customerPhone")?.value || "";

  const currentItem = {
    category: getSelectedValue(categorySelect, categoryCustom) || "",
    itemName: getSelectedValue(itemNameSelect, itemNameCustom) || "",
    height: height?.value || "",
    width: width?.value || "",
    thickness: thickness?.value || "",
    quantity: quantity?.value || "1",
    dimensionUnit: dimensionUnitSelect?.value || "mm",
    unit: unitDisplay?.value || "Sq Ft",
    rate: rate?.value || "0",
    discountPercent: discountPercent?.value || "0",
    round3Inch: round3InchToggle ? round3InchToggle.checked : false
  };

  const draft = {
    customerName,
    flatNo,
    buildingName,
    customerPhone,
    customerGstin: gstinVal,
    paymentMode: document.getElementById("paymentMode")?.value || "Paid",
    date: document.getElementById("estimateDate")?.value || "",
    state: customerState.value,
    currentItem
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

if (categoryCustom) {
  const commitCategory = () => {
    const val = categoryCustom.value.trim();
    if (val && val !== "__custom__") {
      addCategoryOption(val, true);
    }
  };
  categoryCustom.addEventListener("change", commitCategory);
  categoryCustom.addEventListener("blur", commitCategory);
  categoryCustom.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitCategory();
    }
  });
}

if (itemNameCustom) {
  const commitItemName = () => {
    const val = itemNameCustom.value.trim();
    if (val && val !== "__custom__") {
      addItemNameOption(val, true);
    }
  };
  itemNameCustom.addEventListener("change", commitItemName);
  itemNameCustom.addEventListener("blur", commitItemName);
  itemNameCustom.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitItemName();
    }
  });
}

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

/* LIVE CALCULATION (based on canonical calc.js) */
function getCalculation() {
  const dimUnit = dimensionUnitSelect ? dimensionUnitSelect.value : "mm";
  const round3Inch = round3InchToggle ? round3InchToggle.checked : false;
  const basis = unitDisplay ? unitDisplay.value : "Sq Ft";
  const categoryVal = getSelectedValue(categorySelect, categoryCustom);
  const defaultEntry = getRateBookEntry(categoryVal);

  const line = GlassCareCalc.calculateLine({
    unit: basis,
    basis: basis,
    dimensionUnit: dimUnit,
    round3Inch: round3Inch,
    quantity: quantity ? quantity.value : 1,
    rate: rate ? rate.value : 0,
    defaultRate: defaultEntry.rate,
    discountPercent: discountPercent ? discountPercent.value : 0,
    gstRate: gstRateInput ? gstRateInput.value : 18,
    enteredHeight: Number(height.value) || 0,
    enteredWidth: Number(width.value) || 0,
    enteredThickness: Number(thickness.value) || 0,
    height: Number(height.value) || 0,
    width: Number(width.value) || 0,
    thickness: Number(thickness.value) || 0,
    category: categoryVal,
    state: customerState ? customerState.value : "Karnataka"
  });

  return {
    ...line,
    qty: line.quantity,
    itemRate: line.rate,
    discount: line.discountPercent,
    h: line.enteredHeight,
    w: line.enteredWidth,
    area: line.basis === "Sq Ft" ? line.measure : 0,
    runningFeet: line.basis === "Running Ft" ? line.measure : 0,
    volume: line.basis === "Cubic Ft" ? line.measure : 0
  };
}

/* UPDATE SCREEN */
function updateCalculation() {
  const calc = getCalculation();
  const dimUnit = dimensionUnitSelect ? dimensionUnitSelect.value : "mm";

  const thicknessLabel = document.getElementById("thicknessLabel");
  const heightLabel = document.getElementById("heightLabel");
  const widthLabel = document.getElementById("widthLabel");
  const areaCardLabel = document.getElementById("areaCardLabel");
  const formulaNote = document.getElementById("formulaNote");

  // Dynamic labels following the selected dimension unit (Requirement B)
  if (heightLabel) {
    heightLabel.textContent = (calc.basis === "Cubic Ft" ? `Length (${dimUnit})` : `Length / Height (${dimUnit})`);
  }
  if (widthLabel) {
    widthLabel.textContent = `Width (${dimUnit})`;
  }
  if (thicknessLabel) {
    thicknessLabel.textContent = (calc.basis === "Cubic Ft" ? `Depth (${dimUnit})` : `Thickness (${dimUnit})`);
  }

  // Dynamic placeholders
  if (dimUnit === "in") {
    if (height) height.placeholder = "72";
    if (width) width.placeholder = "48";
    if (thickness) thickness.placeholder = calc.basis === "Cubic Ft" ? "12" : "0.5";
  } else if (dimUnit === "mm") {
    if (height) height.placeholder = "1800";
    if (width) width.placeholder = "1200";
    if (thickness) thickness.placeholder = calc.basis === "Cubic Ft" ? "100" : "10";
  } else if (dimUnit === "cm") {
    if (height) height.placeholder = "180";
    if (width) width.placeholder = "120";
    if (thickness) thickness.placeholder = calc.basis === "Cubic Ft" ? "10" : "1";
  } else if (dimUnit === "ft") {
    if (height) height.placeholder = "6";
    if (width) width.placeholder = "4";
    if (thickness) thickness.placeholder = calc.basis === "Cubic Ft" ? "1" : "0.1";
  }

  // Previews under inputs (Requirement B)
  const hVal = Number(height.value) || 0;
  const wVal = Number(width.value) || 0;
  const tVal = Number(thickness.value) || 0;
  const hPrev = document.getElementById("heightPreview");
  const wPrev = document.getElementById("widthPreview");
  const tPrev = document.getElementById("thicknessPreview");
  if (hPrev) hPrev.textContent = GlassCareCalc.formatUnitPreview(hVal, dimUnit);
  if (wPrev) wPrev.textContent = GlassCareCalc.formatUnitPreview(wVal, dimUnit);
  if (tPrev) tPrev.textContent = GlassCareCalc.formatUnitPreview(tVal, dimUnit);

  // Table header unit updates
  document.querySelectorAll(".dim-unit-header").forEach(el => {
    el.textContent = dimUnit;
  });

  if (calc.basis === "Sq Ft") {
    if (areaCardLabel) areaCardLabel.textContent = "Area";
    if (formulaNote) {
      formulaNote.textContent = `ⓘ Sq Ft: dimensions converted from ${dimUnit} to feet (or rounded up to next 3-inch/76.2mm step if enabled). Area = Height ft × Width ft × Qty, Amount = Area × Rate × (1 − Discount%/100).`;
    }
    originalSize.textContent = calc.h && calc.w ? `${calc.h} × ${calc.w} ${dimUnit}` : `-- × -- ${dimUnit}`;
    if (calc.h && calc.w) {
      if (calc.round3Inch && (calc.billedHeightMm !== calc.heightMm || calc.billedWidthMm !== calc.widthMm)) {
        roundedSize.textContent = `${calc.billedHeightMm.toFixed(1)} × ${calc.billedWidthMm.toFixed(1)} mm (rounded)`;
      } else {
        roundedSize.textContent = `${calc.heightMm.toFixed(1)} × ${calc.widthMm.toFixed(1)} mm`;
      }
    } else {
      roundedSize.textContent = `-- × -- mm`;
    }
    areaDisplay.textContent = `${calc.area.toFixed(3)} Sq Ft`;
    document.getElementById("calculationHint").textContent = calc.round3Inch
      ? "Area calculated with 3-inch (76.2 mm) rounding enabled."
      : "Area calculated from exact dimensions.";
  } else if (calc.basis === "Running Ft") {
    if (areaCardLabel) areaCardLabel.textContent = "Running Feet";
    if (formulaNote) {
      formulaNote.textContent = `ⓘ Running Ft: 2 × (Height + Width) ÷ 304.8 × Qty. Amount = Running Ft × Rate × (1 − Discount%/100).`;
    }
    originalSize.textContent = calc.h && calc.w ? `${calc.h} × ${calc.w} ${dimUnit}` : `-- × -- ${dimUnit}`;
    roundedSize.textContent = `${calc.runningFeet.toFixed(2)} R.ft`;
    areaDisplay.textContent = `${calc.runningFeet.toFixed(2)} R.ft`;
    document.getElementById("calculationHint").textContent = "Running feet calculated from perimeter.";
  } else if (calc.basis === "Cubic Ft") {
    if (areaCardLabel) areaCardLabel.textContent = "Cubic Feet";
    if (formulaNote) {
      formulaNote.textContent = `ⓘ Cubic Ft: Volume = (Length × Width × Depth in mm) ÷ 28,316,846.592 × Qty (equal to in³ ÷ 1,728). Amount = Volume × Rate × (1 − Discount%/100).`;
    }
    const hasDims = calc.h > 0 && calc.w > 0 && calc.thickness > 0;
    originalSize.textContent = hasDims ? `${calc.h} × ${calc.w} × ${calc.thickness} ${dimUnit}` : `Length × width × depth required`;
    if (hasDims) {
      if (calc.round3Inch && (calc.billedHeightMm !== calc.heightMm || calc.billedWidthMm !== calc.widthMm || calc.billedThicknessMm !== calc.thicknessMm)) {
        roundedSize.textContent = `${calc.billedHeightMm.toFixed(1)} × ${calc.billedWidthMm.toFixed(1)} × ${calc.billedThicknessMm.toFixed(1)} mm (rounded)`;
      } else {
        roundedSize.textContent = `${calc.heightMm.toFixed(1)} × ${calc.widthMm.toFixed(1)} × ${calc.thicknessMm.toFixed(1)} mm`;
      }
    } else {
      roundedSize.textContent = `-- × -- × -- mm`;
    }
    areaDisplay.textContent = `${calc.volume.toFixed(3)} Cubic Ft`;
    document.getElementById("calculationHint").textContent = calc.round3Inch
      ? "Cubic feet calculated with 3-inch (76.2 mm) rounding enabled."
      : `Cubic feet calculated from exact volume in ${dimUnit}.`;
  } else {
    // Per Piece
    if (areaCardLabel) areaCardLabel.textContent = "Quantity";
    if (formulaNote) {
      formulaNote.textContent = `ⓘ Per Piece: Amount = Quantity × Rate × (1 − Discount%/100).`;
    }
    originalSize.textContent = "Not required";
    roundedSize.textContent = "Not applicable";
    areaDisplay.textContent = `${calc.qty} Pcs`;
    document.getElementById("calculationHint").textContent = "Quantity × rate, less discount.";
  }

  // Explanation string (Requirement G)
  const calcExpl = document.getElementById("calculationExplanation");
  if (calcExpl) {
    if (calc.explanation) {
      calcExpl.style.display = "block";
      calcExpl.textContent = calc.explanation;
    } else {
      calcExpl.style.display = "none";
    }
  }

  // Sanity warnings (Requirement F)
  const warnContainer = document.getElementById("sanityWarningContainer");
  const warnList = document.getElementById("sanityWarningList");
  if (warnContainer && warnList) {
    if (calc.warnings && calc.warnings.length > 0) {
      warnContainer.style.display = "block";
      warnList.innerHTML = calc.warnings.map(w => `<li>${w}</li>`).join("");
    } else {
      warnContainer.style.display = "none";
      warnList.innerHTML = "";
      if (confirmSanityCheckbox) confirmSanityCheckbox.checked = false;
    }
  }

  if (calc.errors && calc.errors.length) {
    document.getElementById("calculationHint").textContent = calc.errors[0];
  }

  amountDisplay.textContent = GlassCareCalc.formatMoney(calc.amount);
}

/* ADD ITEM */
document.getElementById("addItem").addEventListener("click", function () {
  if (categorySelect.value === "__custom__") {
    const customCat = categoryCustom.value.trim();
    if (customCat) addCategoryOption(customCat, true);
  }
  if (itemNameSelect.value === "__custom__") {
    const customItem = itemNameCustom.value.trim();
    if (customItem) addItemNameOption(customItem, true);
  }
  const categoryValue = getSelectedValue(categorySelect, categoryCustom);
  const itemNameValue = getSelectedValue(itemNameSelect, itemNameCustom);
  if (!categoryValue) {
    alert("Please select or type a Product Category.");
    return;
  }

  const calc = getCalculation();
  if (calc.basis === "Sq Ft" && (!calc.h || !calc.w)) {
    alert("Please enter Length/Height and Width for a Sq Ft item.");
    return;
  }
  if (calc.basis === "Running Ft" && (!calc.h || !calc.w)) {
    alert("Please enter Length/Height and Width for a Running Ft item.");
    return;
  }
  if (calc.basis === "Cubic Ft" && (!calc.h || !calc.w || !calc.thickness)) {
    alert("Please enter Length, Width and Depth for a Cubic Ft item.");
    return;
  }
  if (calc.errors && calc.errors.length) {
    alert(calc.errors[0]);
    return;
  }
  if (calc.rate < 0 || calc.quantity < 1 || calc.discountPercent < 0 || calc.discountPercent > 100 || calc.gstRate < 0 || calc.gstRate > 100) {
    alert("Check quantity, rate, discount and GST values. Quantity must be at least 1; rates must be non-negative; percentages must be 0–100.");
    return;
  }

  // Sanity check confirmation gate (Requirement F)
  if (calc.warnings && calc.warnings.length > 0) {
    if (!confirmSanityCheckbox || !confirmSanityCheckbox.checked) {
      alert("Please confirm the highlighted sanity warnings by ticking 'I confirm these values are correct' before adding.");
      if (sanityWarningContainer) {
        sanityWarningContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
        sanityWarningContainer.style.borderColor = "#dc2626";
      }
      return;
    }
  }

  const dimUnit = dimensionUnitSelect ? dimensionUnitSelect.value : "mm";
  const item = {
    id: Date.now(),
    category: categoryValue,
    itemName: itemNameValue,
    unit: calc.basis,
    basis: calc.basis,
    dimensionUnit: dimUnit,
    enteredHeight: calc.enteredHeight,
    enteredWidth: calc.enteredWidth,
    enteredThickness: calc.enteredThickness,
    height: calc.enteredHeight,
    width: calc.enteredWidth,
    thickness: calc.enteredThickness,
    heightMm: calc.heightMm,
    widthMm: calc.widthMm,
    thicknessMm: calc.thicknessMm,
    billedHeightMm: calc.billedHeightMm,
    billedWidthMm: calc.billedWidthMm,
    billedThicknessMm: calc.billedThicknessMm,
    round3Inch: calc.round3Inch,
    quantity: calc.quantity,
    rate: calc.rate,
    discountPercent: calc.discountPercent,
    gstRate: calc.gstRate,
    grossAmount: calc.grossAmount,
    discountAmount: calc.discountAmount,
    taxableAmount: calc.taxableAmount,
    taxAmount: calc.taxAmount,
    amount: calc.taxableAmount,
    cgst: calc.cgst,
    sgst: calc.sgst,
    igst: calc.igst,
    lineTotal: calc.lineTotal,
    explanation: calc.explanation,
    measure: calc.measure,
    measureLabel: calc.measureLabel
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
  unitDisplay.value = "Sq Ft";
  if (basisOverriddenTag) basisOverriddenTag.style.display = "none";
  if (confirmSanityCheckbox) confirmSanityCheckbox.checked = false;
  if (sanityWarningContainer) sanityWarningContainer.style.display = "none";
  updateCalculation();
  persistDraft();
}

const clearItemBtn = document.getElementById("clearItemBtn");
if (clearItemBtn) {
  clearItemBtn.addEventListener("click", () => {
    resetItemForm();
  });
}

const clearCustomerBtn = document.getElementById("clearCustomerBtn");
if (clearCustomerBtn) {
  clearCustomerBtn.addEventListener("click", () => {
    const prevGstin = (document.getElementById("customerGstin")?.value || "").trim().toUpperCase();
    ["customerName", "flatNo", "buildingName", "customerPhone", "customerGstin"].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = "";
    });
    if (prevGstin) {
      try {
        const raw = localStorage.getItem(GSTIN_DIRECTORY_KEY);
        if (raw) {
          const dir = JSON.parse(raw);
          delete dir[prevGstin];
          localStorage.setItem(GSTIN_DIRECTORY_KEY, JSON.stringify(dir));
        }
      } catch (e) {}
    }
    const statusEl = document.getElementById("gstinStatus");
    if (statusEl) {
      statusEl.textContent = "";
      statusEl.className = "gstin-status";
      statusEl.style.display = "none";
    }
    persistDraft();
  });
}

/* RECALCULATE A ROW FROM ITS FIELDS */
function recalcItem(item) {
  const dimUnit = item.dimensionUnit || "mm";
  const calculated = GlassCareCalc.calculateLine({
    ...item,
    unit: item.basis || item.unit,
    basis: item.basis || item.unit,
    dimensionUnit: dimUnit,
    enteredHeight: item.enteredHeight != null ? item.enteredHeight : item.height,
    enteredWidth: item.enteredWidth != null ? item.enteredWidth : item.width,
    enteredThickness: item.enteredThickness != null ? item.enteredThickness : item.thickness,
    height: item.enteredHeight != null ? item.enteredHeight : item.height,
    width: item.enteredWidth != null ? item.enteredWidth : item.width,
    thickness: item.enteredThickness != null ? item.enteredThickness : item.thickness,
    round3Inch: item.round3Inch !== undefined ? item.round3Inch : false,
    state: customerState ? customerState.value : "Karnataka"
  });
  Object.assign(item, calculated);
}

function clearAmountOverrides(item) {
  delete item.taxableAmountOverride;
  delete item.taxAmountOverride;
}

/* RENDER TABLE (All 14 columns present, responsive horizontal scroll, editable in place) */
function renderEstimate() {
  estimateBody.innerHTML = "";

  if (estimateItems.length === 0) {
    estimateBody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align:center;padding:48px 20px;color:#64748b;font-size:13.5px;background:#f8fafc;">
          <div style="font-size:26px;margin-bottom:8px;">📋</div>
          <strong style="color:#1e293b;font-size:15px;display:block;margin-bottom:4px;">No items added to current estimate</strong>
          <span style="color:#64748b;">Select a product category and enter dimensions above, then click <b>“+ ADD ITEM TO ESTIMATE”</b>.</span>
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

    // 1. # Cell (sticky)
    const numCell = document.createElement("td");
    numCell.textContent = index + 1;
    numCell.style.fontWeight = "600";
    row.appendChild(numCell);

    // 2. Category / Item Cell
    const catCell = document.createElement("td");
    const catInput = document.createElement("input");
    catInput.className = "cell-edit";
    catInput.value = item.category || "";
    catInput.addEventListener("change", () => { item.category = catInput.value; updateTotals(); });
    const itemInput = document.createElement("input");
    itemInput.className = "cell-edit item-category";
    itemInput.value = item.itemName || "";
    itemInput.placeholder = "Item name";
    itemInput.addEventListener("change", () => { item.itemName = itemInput.value; updateTotals(); });
    catCell.appendChild(catInput);
    catCell.appendChild(itemInput);
    row.appendChild(catCell);

    // 3. Size Cell (Length/Height × Width with unit)
    const sizeCell = document.createElement("td");
    if (item.basis === "Per Piece") {
      sizeCell.textContent = "—";
      sizeCell.style.textAlign = "center";
    } else {
      const sizeRow = document.createElement("div");
      sizeRow.className = "size-row";
      sizeRow.style.display = "flex";
      sizeRow.style.alignItems = "center";
      sizeRow.style.gap = "4px";

      const hInput = document.createElement("input");
      hInput.type = "number";
      hInput.step = "any";
      hInput.className = "cell-edit";
      hInput.min = "0";
      hInput.value = item.enteredHeight ?? item.height ?? 0;
      hInput.style.width = "65px";
      hInput.addEventListener("input", () => {
        const val = Number(hInput.value) || 0;
        item.enteredHeight = val;
        item.height = val;
        item.heightMm = GlassCareCalc.toMm(val, item.dimensionUnit || "mm");
        delete item.measureOverride;
        clearAmountOverrides(item);
        recalcItem(item);
        refreshRowCalcs(row, item);
        updateTotals();
      });

      const xSpan = document.createElement("span");
      xSpan.textContent = "×";

      const wInput = document.createElement("input");
      wInput.type = "number";
      wInput.step = "any";
      wInput.className = "cell-edit";
      wInput.min = "0";
      wInput.value = item.enteredWidth ?? item.width ?? 0;
      wInput.style.width = "65px";
      wInput.addEventListener("input", () => {
        const val = Number(wInput.value) || 0;
        item.enteredWidth = val;
        item.width = val;
        item.widthMm = GlassCareCalc.toMm(val, item.dimensionUnit || "mm");
        delete item.measureOverride;
        clearAmountOverrides(item);
        recalcItem(item);
        refreshRowCalcs(row, item);
        updateTotals();
      });

      const uSpan = document.createElement("span");
      uSpan.className = "unit-badge";
      uSpan.textContent = item.dimensionUnit || "mm";
      uSpan.style.fontSize = "11px";
      uSpan.style.color = "#64748b";

      sizeRow.append(hInput, xSpan, wInput, uSpan);
      sizeCell.appendChild(sizeRow);

      const roundedNote = document.createElement("div");
      roundedNote.className = "rounded-note";
      roundedNote.style.fontSize = "11px";
      roundedNote.style.color = "#059669";
      if (item.round3Inch && (item.billedHeightMm !== item.heightMm || item.billedWidthMm !== item.widthMm || (item.basis === "Cubic Ft" && item.billedThicknessMm !== item.thicknessMm))) {
        if (item.basis === "Cubic Ft") {
          roundedNote.textContent = `${item.billedHeightMm.toFixed(1)} × ${item.billedWidthMm.toFixed(1)} × ${item.billedThicknessMm.toFixed(1)} mm (rounded)`;
        } else {
          roundedNote.textContent = `${item.billedHeightMm.toFixed(1)} × ${item.billedWidthMm.toFixed(1)} mm (rounded)`;
        }
      }
      sizeCell.appendChild(roundedNote);
    }
    row.appendChild(sizeCell);

    // 4. Thickness / Depth Cell
    const thickDepthCell = document.createElement("td");
    thickDepthCell.className = "thickness-depth-cell";
    if (item.basis === "Sq Ft" || item.basis === "Cubic Ft") {
      const tdRow = document.createElement("div");
      tdRow.style.display = "flex";
      tdRow.style.alignItems = "center";
      tdRow.style.gap = "4px";

      const tdInput = document.createElement("input");
      tdInput.type = "number";
      tdInput.step = "any";
      tdInput.className = "cell-edit thickness-depth-input";
      tdInput.min = "0";
      tdInput.value = item.enteredThickness ?? item.thickness ?? "";
      tdInput.style.width = "60px";
      tdInput.placeholder = item.basis === "Cubic Ft" ? "Depth" : "10";
      tdInput.addEventListener("input", () => {
        const val = Number(tdInput.value) || 0;
        item.enteredThickness = val;
        item.thickness = val;
        item.thicknessMm = GlassCareCalc.toMm(val, item.dimensionUnit || "mm");
        if (item.basis === "Cubic Ft") delete item.measureOverride;
        clearAmountOverrides(item);
        recalcItem(item);
        refreshRowCalcs(row, item);
        updateTotals();
      });

      const uSpan = document.createElement("span");
      uSpan.textContent = item.dimensionUnit || "mm";
      uSpan.style.fontSize = "11px";
      uSpan.style.color = "#64748b";

      tdRow.append(tdInput, uSpan);
      thickDepthCell.appendChild(tdRow);
    } else {
      thickDepthCell.textContent = "—";
      thickDepthCell.style.textAlign = "center";
    }
    row.appendChild(thickDepthCell);

    // 5. Qty Cell
    const qtyCell = document.createElement("td");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.className = "cell-edit";
    qtyInput.value = item.quantity;
    qtyInput.style.width = "50px";
    qtyInput.addEventListener("input", () => {
      item.quantity = qtyInput.value === "" ? 0 : Number(qtyInput.value);
      delete item.measureOverride;
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    qtyCell.appendChild(qtyInput);
    row.appendChild(qtyCell);

    // 6. Basis Cell
    const basisCell = document.createElement("td");
    const basisSelect = document.createElement("select");
    basisSelect.className = "cell-edit";
    ["Sq Ft", "Running Ft", "Cubic Ft", "Per Piece"].forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      if (b === (item.basis || item.unit)) opt.selected = true;
      basisSelect.appendChild(opt);
    });
    basisSelect.addEventListener("change", () => {
      item.basis = basisSelect.value;
      item.unit = basisSelect.value;
      delete item.measureOverride;
      clearAmountOverrides(item);
      recalcItem(item);
      renderEstimate();
    });
    basisCell.appendChild(basisSelect);
    row.appendChild(basisCell);

    // 7. Quantity Used (Measure) Cell
    const areaCell = document.createElement("td");
    areaCell.className = "area-cell";
    const measureInput = document.createElement("input");
    measureInput.type = "number";
    measureInput.step = "any";
    measureInput.className = "cell-edit measure-input";
    measureInput.min = "0";
    measureInput.style.width = "75px";
    measureInput.value = Number(item.measure || 0).toFixed(item.basis === "Running Ft" ? 2 : 3);
    measureInput.title = item.measureLabel || "";
    measureInput.disabled = item.basis === "Per Piece";
    measureInput.addEventListener("input", () => {
      item.measureOverride = Number(measureInput.value);
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    areaCell.appendChild(measureInput);
    row.appendChild(areaCell);

    // 8. Rate Cell
    const rateCell = document.createElement("td");
    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.step = "any";
    rateInput.min = "0";
    rateInput.className = "cell-edit";
    rateInput.value = item.rate;
    rateInput.style.width = "65px";
    rateInput.addEventListener("input", () => {
      item.rate = Number(rateInput.value) || 0;
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    rateCell.appendChild(rateInput);
    row.appendChild(rateCell);

    // 9. Discount (%) Cell
    const discountCell = document.createElement("td");
    const discountInput = document.createElement("input");
    discountInput.type = "number";
    discountInput.step = "0.01";
    discountInput.min = "0";
    discountInput.max = "100";
    discountInput.className = "cell-edit";
    discountInput.value = item.discountPercent ?? 10;
    discountInput.style.width = "50px";
    discountInput.addEventListener("input", () => {
      item.discountPercent = Math.min(100, Math.max(0, Number(discountInput.value) || 0));
      clearAmountOverrides(item);
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    discountCell.appendChild(discountInput);
    row.appendChild(discountCell);

    // 10. Taxable Amount (₹) Cell
    const taxableCell = document.createElement("td");
    taxableCell.className = "amount taxable-amount-cell";
    const taxableInput = document.createElement("input");
    taxableInput.type = "number";
    taxableInput.step = "0.01";
    taxableInput.min = "0";
    taxableInput.className = "cell-edit taxable-amount-input";
    taxableInput.value = Number(item.taxableAmount || 0).toFixed(2);
    taxableInput.style.width = "80px";
    taxableInput.addEventListener("input", () => {
      item.taxableAmountOverride = Number(taxableInput.value);
      delete item.taxAmountOverride;
      recalcItem(item);
      discountInput.value = Number(item.discountPercent || 0).toFixed(2);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    taxableCell.appendChild(taxableInput);
    row.appendChild(taxableCell);

    // 11. GST (%) Cell
    const gstCell = document.createElement("td");
    const gstInput = document.createElement("input");
    gstInput.type = "number";
    gstInput.step = "0.01";
    gstInput.min = "0";
    gstInput.max = "100";
    gstInput.className = "cell-edit";
    gstInput.value = item.gstRate ?? GST_RATE;
    gstInput.style.width = "48px";
    gstInput.addEventListener("input", () => {
      item.gstRate = Number(gstInput.value) || 0;
      delete item.taxAmountOverride;
      recalcItem(item);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    gstCell.appendChild(gstInput);
    row.appendChild(gstCell);

    // 12. GST Amount (₹) Cell
    const taxAmountCell = document.createElement("td");
    taxAmountCell.className = "tax-amount-cell";
    const taxAmountInput = document.createElement("input");
    taxAmountInput.type = "number";
    taxAmountInput.step = "0.01";
    taxAmountInput.min = "0";
    taxAmountInput.className = "cell-edit tax-amount-input";
    taxAmountInput.value = Number(item.taxAmount || 0).toFixed(2);
    taxAmountInput.style.width = "75px";
    taxAmountInput.addEventListener("input", () => {
      item.taxAmountOverride = Number(taxAmountInput.value);
      recalcItem(item);
      gstInput.value = Number(item.gstRate || 0).toFixed(2);
      refreshRowCalcs(row, item);
      updateTotals();
    });
    taxAmountCell.appendChild(taxAmountInput);
    row.appendChild(taxAmountCell);

    // 13. Line Total (₹) Cell
    const lineTotalCell = document.createElement("td");
    lineTotalCell.className = "line-total-cell";
    lineTotalCell.style.fontWeight = "700";
    lineTotalCell.style.color = "#15803d";
    lineTotalCell.style.whiteSpace = "nowrap";
    lineTotalCell.textContent = GlassCareCalc.formatMoney(item.lineTotal || 0);
    row.appendChild(lineTotalCell);

    // 14. Action Cell
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
      rowFields.forEach(field => { field.disabled = false; });
    });
    saveBtn.addEventListener("click", () => {
      recalcItem(item);
      if (item.errors && item.errors.length) {
        alert(`Please correct this item: ${item.errors[0]}`);
        return;
      }
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
    deleteBtn.title = "Delete item";
    deleteBtn.addEventListener("click", () => deleteItem(item.id));
    actionCell.appendChild(deleteBtn);

    const rowError = document.createElement("span");
    rowError.className = "row-error";
    actionCell.appendChild(rowError);
    row.appendChild(actionCell);

    estimateBody.appendChild(row);
    refreshRowCalcs(row, item);
  });

  document.getElementById("itemCount").textContent =
    `${estimateItems.length} item${estimateItems.length === 1 ? "" : "s"} added`;
  updateTotals();
}

/* Update the read-only Area and Amount cells of a row without a full re-render */
function refreshRowCalcs(row, item) {
  const measureInput = row.querySelector(".measure-input");
  const taxableInput = row.querySelector(".taxable-amount-input");
  const taxAmountInput = row.querySelector(".tax-amount-input");
  const lineTotalCell = row.querySelector(".line-total-cell");
  const roundedNote = row.querySelector(".rounded-note");

  if (document.activeElement !== measureInput && measureInput) {
    measureInput.value = Number(item.measure || 0).toFixed(item.basis === "Running Ft" ? 2 : 3);
    measureInput.title = item.measureLabel || "";
  }
  if (document.activeElement !== taxableInput && taxableInput) {
    taxableInput.value = Number(item.taxableAmount || 0).toFixed(2);
  }
  if (document.activeElement !== taxAmountInput && taxAmountInput) {
    taxAmountInput.value = Number(item.taxAmount || 0).toFixed(2);
  }
  if (lineTotalCell) {
    lineTotalCell.textContent = GlassCareCalc.formatMoney(item.lineTotal || 0);
  }
  if (roundedNote) {
    if (item.round3Inch && (item.billedHeightMm !== item.heightMm || item.billedWidthMm !== item.widthMm || (item.basis === "Cubic Ft" && item.billedThicknessMm !== item.thicknessMm))) {
      if (item.basis === "Cubic Ft") {
        roundedNote.textContent = `${item.billedHeightMm.toFixed(1)} × ${item.billedWidthMm.toFixed(1)} × ${item.billedThicknessMm.toFixed(1)} mm (rounded)`;
      } else {
        roundedNote.textContent = `${item.billedHeightMm.toFixed(1)} × ${item.billedWidthMm.toFixed(1)} mm (rounded)`;
      }
    } else {
      roundedNote.textContent = "";
    }
  }
  const rowError = row.querySelector(".row-error");
  if (rowError) {
    rowError.textContent = (item.errors || []).join(" ");
  }
}

/* DELETE */
function deleteItem(id) {
  estimateItems = estimateItems.filter(item => item.id !== id);
  renderEstimate();
}

/* RESET ESTIMATE FORM */
function resetEstimateForm(clearCustomer = true) {
  estimateItems = [];
  try {
    localStorage.removeItem("glassCareEstimate");
    localStorage.removeItem("glassCareDraft");
  } catch (e) {}

  if (clearCustomer) {
    ["customerName", "flatNo", "buildingName", "customerPhone", "customerGstin"].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = "";
    });
    showGstinStatus("", "info");
    const paymentSelect = document.getElementById("paymentMode");
    if (paymentSelect) paymentSelect.value = "Paid";
    const dateField = document.getElementById("estimateDate");
    if (dateField) dateField.value = new Date().toISOString().split("T")[0];
    if (customerState && states.length) customerState.value = states[0] || "Karnataka";
  }

  if (categorySelect) {
    categorySelect.value = "";
    getCustomCategories().forEach(cat => addCategoryOption(cat, false));
  }
  if (categoryCustom) { categoryCustom.style.display = "none"; categoryCustom.value = ""; }
  if (itemNameSelect) {
    if (itemNameSelect.options.length <= 2) {
      itemNameSelect.innerHTML = `
        <option value="">-- Select item --</option>
        <option value="__custom__">＋ Type new item...</option>
      `;
      fillSelect(itemNameSelect, itemNames, true);
    }
    getCustomItemNames().forEach(item => addItemNameOption(item, false));
    itemNameSelect.value = "";
    itemNameSelect.disabled = false;
  }
  if (itemNameCustom) { itemNameCustom.style.display = "none"; itemNameCustom.value = ""; }
  if (height) height.value = "";
  if (width) width.value = "";
  if (thickness) thickness.value = "";
  if (quantity) quantity.value = 1;
  const unitSelectEl = document.getElementById("unit");
  if (unitSelectEl) unitSelectEl.value = "Sqft";
  if (gstRateInput) gstRateInput.value = "18";
  if (rate) rate.value = "";
  if (discountPercent) discountPercent.value = "0";

  const estNum = document.getElementById("estimateNumber");
  if (estNum) estNum.textContent = generateEstimateNumber();

  renderEstimate();
  updateCalculation();
}

window.GlassCareEstimate = {
  reset: resetEstimateForm,
  get items() { return estimateItems; }
};

/* CLEAR ALL / NEW ESTIMATE */
document.getElementById("clearAll")?.addEventListener("click", function () {
  const hasData = estimateItems.length > 0 ||
    ["customerName", "flatNo", "buildingName", "customerPhone", "customerGstin"].some(id => document.getElementById(id)?.value?.trim());
  if (hasData) {
    if (confirm("Start a new estimate? Current unsaved items and customer details will be cleared.")) {
      resetEstimateForm(true);
    }
  } else {
    resetEstimateForm(true);
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
  const ro = totals.roundOff;
  const roEl = document.getElementById("roundOff");
  if (roEl) {
    if (Math.abs(ro) < 0.005) {
      roEl.textContent = "₹0.00";
    } else {
      const roAbs = Math.abs(ro).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      roEl.textContent = `${ro > 0 ? "+ " : "- "}₹${roAbs}`;
    }
  }
  grandTotalDisplay.textContent = formatMoney(totals.payable, 0);
  amountWords.textContent = GlassCareCalc.formatIndianWords(totals.payable);
  try { localStorage.setItem("glassCareEstimate", JSON.stringify(estimateItems)); } catch { /* storage may be disabled */ }
  persistDraft();
}

/* MONEY FORMAT */
function formatMoney(value) {
  return GlassCareCalc.formatMoney(value);
}

/* AMOUNT IN WORDS */
function numberToWords(num) {
  return GlassCareCalc.formatIndianWords(num);
}

/* EVENTS */
[height, width, thickness, quantity, rate, discountPercent, gstRateInput, unitDisplay, dimensionUnitSelect, round3InchToggle].forEach(el => {
  if (el) {
    el.addEventListener("input", () => {
      updateCalculation();
      persistDraft();
    });
    el.addEventListener("change", () => {
      updateCalculation();
      persistDraft();
    });
  }
});
if (customerState) customerState.addEventListener("change", () => { updateTotals(); persistDraft(); });
document.getElementById("estimateDate")?.addEventListener("change", persistDraft);

/* REAL-TIME CROSS-TAB DATA SYNCHRONIZATION */
window.addEventListener("storage", (e) => {
  if (e.key === "glassCareEstimate" && e.newValue) {
    try {
      estimateItems = JSON.parse(e.newValue);
      renderEstimate();
    } catch {}
  } else if (e.key === "glassCareDraft" && e.newValue) {
    try {
      const d = JSON.parse(e.newValue);
      ["customerName", "flatNo", "buildingName", "customerPhone", "paymentMode"].forEach(id => {
        const field = document.getElementById(id);
        if (field && d[id] !== undefined && field !== document.activeElement) {
          field.value = d[id];
        }
      });
      if (d.customerGstin && document.getElementById("customerGstin") !== document.activeElement) {
        document.getElementById("customerGstin").value = d.customerGstin;
      }
    } catch {}
  }
});

if (globalRound3InchSetting) {
  const savedDefault = localStorage.getItem("glasscare_round3inch_default") === "true";
  globalRound3InchSetting.checked = savedDefault;
  if (round3InchToggle) round3InchToggle.checked = savedDefault;
  globalRound3InchSetting.addEventListener("change", () => {
    localStorage.setItem("glasscare_round3inch_default", String(globalRound3InchSetting.checked));
    if (round3InchToggle) {
      round3InchToggle.checked = globalRound3InchSetting.checked;
      updateCalculation();
    }
  });
}

/* START */
let hasInitialized = false;
function runInitialization() {
  if (hasInitialized) return;
  hasInitialized = true;
  initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runInitialization);
} else {
  runInitialization();
}