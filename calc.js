(function (root, factory) {
  const DecimalLib = typeof Decimal !== "undefined"
    ? Decimal
    : (typeof require === "function" ? require("./decimal.js") : null);
  const api = factory(DecimalLib);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) {
    root.GlassCareCalc = api;
    root.GlassCareCalculations = api;
    root.calc = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (DecimalLib) {
  "use strict";

  const Decimal = DecimalLib || (function () {
    // Minimal fallback if Decimal is unavailable
    function D(val) { this.val = Number(val) || 0; }
    D.prototype.times = function (o) { return new D(this.val * (o.val !== undefined ? o.val : Number(o))); };
    D.prototype.dividedBy = D.prototype.div = function (o) { return new D(this.val / (o.val !== undefined ? o.val : Number(o))); };
    D.prototype.plus = function (o) { return new D(this.val + (o.val !== undefined ? o.val : Number(o))); };
    D.prototype.minus = function (o) { return new D(this.val - (o.val !== undefined ? o.val : Number(o))); };
    D.prototype.toNumber = function () { return this.val; };
    D.prototype.toFixed = function (dp) { return this.val.toFixed(dp); };
    D.prototype.toDecimalPlaces = function (dp) {
      const factor = Math.pow(10, dp);
      return new D(Math.round(this.val * factor) / factor);
    };
    D.set = function () {};
    return D;
  })();

  if (Decimal.set) {
    try {
      Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
    } catch (e) {}
  }

  const MM_PER_FOOT = 304.8;
  const MM_PER_INCH = 25.4;
  const SQFT_MM = 92903.04;
  const CUBIC_FOOT_MM = 28316846.592; // (304.8) ** 3
  const THREE_INCH_MM = 76.2; // 3 * 25.4

  const CONVERSION_FACTORS_TO_MM = {
    mm: 1,
    cm: 10,
    in: 25.4,
    inch: 25.4,
    inches: 25.4,
    ft: 304.8,
    foot: 304.8,
    feet: 304.8
  };

  function normalizeUnit(unit) {
    if (!unit) return "mm";
    const u = String(unit).trim().toLowerCase();
    if (u === "in" || u === "inch" || u === "inches" || u === "\"") return "in";
    if (u === "cm" || u === "centimeter" || u === "centimeters") return "cm";
    if (u === "ft" || u === "foot" || u === "feet" || u === "'") return "ft";
    return "mm";
  }

  function normalizeBasis(basis) {
    if (!basis) return "Sq Ft";
    const b = String(basis).trim().toLowerCase();
    if (b.includes("sq")) return "Sq Ft";
    if (b.includes("run") || b.includes("r.ft") || b.includes("rft")) return "Running Ft";
    if (b.includes("cub") || b.includes("cft")) return "Cubic Ft";
    if (b.includes("piece") || b.includes("pcs") || b.includes("job")) return "Per Piece";
    return "Sq Ft";
  }

  function toMm(val, unit) {
    const num = Number(val) || 0;
    const factor = CONVERSION_FACTORS_TO_MM[normalizeUnit(unit)] || 1;
    return num * factor;
  }

  function fromMm(mmVal, targetUnit) {
    const num = Number(mmVal) || 0;
    const factor = CONVERSION_FACTORS_TO_MM[normalizeUnit(targetUnit)] || 1;
    return num / factor;
  }

  function round3InchMm(sizeMm) {
    const num = Number(sizeMm) || 0;
    if (num <= 0) return 0;
    return Number((Math.ceil(num / THREE_INCH_MM) * THREE_INCH_MM).toFixed(1));
  }

  function roundHalfUp(d, decimals = 2) {
    const dec = new Decimal(d);
    return dec.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
  }

  function formatMoney(value, decimals = 2) {
    const num = Number(value) || 0;
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${isNegative ? "-" : ""}₹${formatted}`;
  }

  function formatIndianWords(num) {
    const n = Math.round(Number(num) || 0);
    if (n === 0) return "Rupees Zero Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convert(val) {
      if (val < 20) return ones[val];
      if (val < 100) return (tens[Math.floor(val / 10)] + (val % 10 ? " " + ones[val % 10] : "")).trim();
      if (val < 1000) return (ones[Math.floor(val / 100)] + " Hundred" + (val % 100 ? " " + convert(val % 100) : "")).trim();
      if (val < 100000) return (convert(Math.floor(val / 1000)) + " Thousand" + (val % 1000 ? " " + convert(val % 1000) : "")).trim();
      if (val < 10000000) return (convert(Math.floor(val / 100000)) + " Lakh" + (val % 100000 ? " " + convert(val % 100000) : "")).trim();
      return (convert(Math.floor(val / 10000000)) + " Crore" + (val % 10000000 ? " " + convert(val % 10000000) : "")).trim();
    }

    return "Rupees " + convert(n) + " Only";
  }

  function formatUnitPreview(val, unit) {
    const num = Number(val) || 0;
    if (num <= 0) return "";
    const u = normalizeUnit(unit);
    if (u === "mm") {
      const inVal = (num / MM_PER_INCH).toFixed(2);
      return `${num} mm = ${inVal} in`;
    } else if (u === "in") {
      const mmVal = (num * MM_PER_INCH).toFixed(1);
      return `${num} in = ${mmVal} mm`;
    } else if (u === "cm") {
      const mmVal = (num * 10).toFixed(1);
      const inVal = (num * 10 / MM_PER_INCH).toFixed(2);
      return `${num} cm = ${mmVal} mm (${inVal} in)`;
    } else if (u === "ft") {
      const mmVal = (num * MM_PER_FOOT).toFixed(1);
      const inVal = (num * 12).toFixed(1);
      return `${num} ft = ${inVal} in (${mmVal} mm)`;
    }
    return "";
  }

  // Checks sanity rules:
  // - any dimension above 6000 mm
  // - depth/thickness above 100 mm for glass
  // - depth/thickness above 300 mm for anything
  // - any dimension below 3 mm
  // - Qty above 500
  // - discount above 50%
  // - rate more than 5x or less than 0.2x the Rate Book default
  // - unit mix-up: unit is Inches and a size > 500, or unit is mm and every size < 20
  function checkSanity(item) {
    const warnings = [];
    const basis = normalizeBasis(item.unit || item.basis);
    const dimUnit = normalizeUnit(item.dimensionUnit || "mm");

    const enteredH = Number(item.enteredHeight ?? item.height) || 0;
    const enteredW = Number(item.enteredWidth ?? item.width) || 0;
    const enteredD = Number(item.enteredThickness ?? item.thickness) || 0;

    const hMm = Number(item.heightMm ?? (item.dimensionUnit ? toMm(enteredH, item.dimensionUnit) : enteredH)) || 0;
    const wMm = Number(item.widthMm ?? (item.dimensionUnit ? toMm(enteredW, item.dimensionUnit) : enteredW)) || 0;
    const dMm = Number(item.thicknessMm ?? (item.dimensionUnit ? toMm(enteredD, item.dimensionUnit) : enteredD)) || 0;

    const qty = Number(item.quantity) || 0;
    const discount = Number(item.discountPercent ?? item.discount) || 0;
    const rate = Number(item.rate) || 0;
    const defaultRate = Number(item.defaultRate) || 0;

    const isGlass = item.isGlass ?? (
      (item.category && /glass|mirror|glazing/i.test(item.category)) ||
      (item.itemName && /glass|mirror|glazing/i.test(item.itemName))
    );

    // Dimension checks (only for dimensional basis)
    if (basis !== "Per Piece") {
      const dims = [hMm, wMm];
      if (basis === "Cubic Ft") dims.push(dMm);

      dims.forEach((d, idx) => {
        const name = idx === 0 ? "Height/Length" : (idx === 1 ? "Width" : "Depth");
        if (d > 0 && d < 3) {
          warnings.push(`${name} (${d.toFixed(1)} mm) is below 3 mm.`);
        }
        if (d > 6000) {
          warnings.push(`${name} (${d.toFixed(1)} mm) exceeds 6,000 mm (6 metres).`);
        }
      });

      // Thickness/Depth checks
      if (dMm > 0) {
        if (isGlass && dMm > 100) {
          warnings.push(`Thickness/Depth (${dMm.toFixed(1)} mm) exceeds 100 mm for glass.`);
        } else if (dMm > 300) {
          warnings.push(`Thickness/Depth (${dMm.toFixed(1)} mm) exceeds 300 mm.`);
        }
      }

      // Unit mix-up checks
      if (dimUnit === "in") {
        if (enteredH > 500 || enteredW > 500 || enteredD > 500) {
          warnings.push("Unit is set to Inches, but a dimension exceeds 500 inches (over 40 ft). Did you mean mm?");
        }
      } else if (dimUnit === "mm") {
        const nonZero = [enteredH, enteredW].filter(x => x > 0);
        if (nonZero.length > 0 && nonZero.every(x => x < 20)) {
          warnings.push("Unit is set to mm, but dimensions are all under 20 mm. Did you mean inches?");
        }
      }
    }

    if (qty > 500) {
      warnings.push(`Quantity (${qty}) exceeds 500.`);
    }

    if (discount > 50) {
      warnings.push(`Discount (${discount}%) exceeds 50%.`);
    }

    if (defaultRate > 0 && rate > 0) {
      if (rate > defaultRate * 5) {
        warnings.push(`Rate (₹${rate}) is more than 5× the default Rate Book rate (₹${defaultRate}).`);
      } else if (rate < defaultRate * 0.2) {
        warnings.push(`Rate (₹${rate}) is less than 0.2× the default Rate Book rate (₹${defaultRate}).`);
      }
    }

    return warnings;
  }

  // Pure line calculation function
  function calculateLine(item) {
    const basis = normalizeBasis(item.unit || item.basis || "Sq Ft");
    // Resolve entered vs mm dimensions
    let enteredH = Number(item.enteredHeight != null ? item.enteredHeight : item.height) || 0;
    let enteredW = Number(item.enteredWidth != null ? item.enteredWidth : item.width) || 0;
    let enteredD = Number(item.enteredThickness != null ? item.enteredThickness : item.thickness) || 0;

    const dimUnit = item.dimensionUnit
      ? normalizeUnit(item.dimensionUnit)
      : (basis === "Cubic Ft" && enteredH <= 120 && enteredW <= 120 && enteredD <= 120 ? "in" : "mm");

    const round3Inch = item.round3Inch !== undefined
      ? Boolean(item.round3Inch)
      : (basis === "Sq Ft");

    // If item already has explicit heightMm/widthMm, honor them; else convert
    let hMm = item.heightMm != null ? Number(item.heightMm) : toMm(enteredH, dimUnit);
    let wMm = item.widthMm != null ? Number(item.widthMm) : toMm(enteredW, dimUnit);
    let dMm = item.thicknessMm != null ? Number(item.thicknessMm) : toMm(enteredD, dimUnit);

    const quantity = Math.max(0, Number(item.quantity ?? 1));
    const rate = Math.max(0, Number(item.rate ?? 0));
    let discountPercent = Math.min(100, Math.max(0, Number(item.discountPercent ?? item.discount ?? 0)));
    let gstRate = Math.min(100, Math.max(0, Number(item.gstRate ?? 18)));
    const state = item.state || "Karnataka";
    const isKarnataka = state === "Karnataka";

    const errors = [];
    if (quantity < 1) errors.push("Quantity must be at least 1.");

    // Rounded sizes
    let billedHMm = hMm;
    let billedWMm = wMm;
    let billedDMm = dMm;

    if (round3Inch && (basis === "Sq Ft" || basis === "Running Ft")) {
      billedHMm = round3InchMm(hMm);
      billedWMm = round3InchMm(wMm);
    }

    let measure = 0;
    let measureLabel = "";
    let stepFormula = "";

    if (basis === "Sq Ft") {
      if (hMm <= 0 || wMm <= 0) errors.push("Length/Height and Width are required for Sq Ft.");
      const hFt = new Decimal(billedHMm).dividedBy(MM_PER_FOOT);
      const wFt = new Decimal(billedWMm).dividedBy(MM_PER_FOOT);
      const decMeasure = hFt.times(wFt).times(quantity);
      measure = decMeasure.toNumber();
      measureLabel = `${decMeasure.toFixed(3)} Sq Ft`;

      const origText = `${enteredH} × ${enteredW} ${dimUnit}`;
      if (round3Inch && (billedHMm !== hMm || billedWMm !== wMm)) {
        stepFormula = `${origText} → rounded ${billedHMm} × ${billedWMm} mm → ${decMeasure.toFixed(3)} sq ft × ₹${rate}`;
      } else {
        stepFormula = `${origText} → ${decMeasure.toFixed(3)} sq ft × ₹${rate}`;
      }
    } else if (basis === "Running Ft") {
      if (hMm <= 0 || wMm <= 0) errors.push("Length/Height and Width are required for Running Ft.");
      const hFt = new Decimal(billedHMm).dividedBy(MM_PER_FOOT);
      const wFt = new Decimal(billedWMm).dividedBy(MM_PER_FOOT);
      const decMeasure = hFt.plus(wFt).times(2).times(quantity);
      measure = decMeasure.toNumber();
      measureLabel = `${decMeasure.toFixed(3)} R.ft`;

      const origText = `${enteredH} × ${enteredW} ${dimUnit}`;
      if (round3Inch && (billedHMm !== hMm || billedWMm !== wMm)) {
        stepFormula = `2 × (${billedHMm} + ${billedWMm} mm rounded) ÷ 304.8 × ${quantity} → ${decMeasure.toFixed(3)} R.ft × ₹${rate}`;
      } else {
        stepFormula = `2 × (${enteredH} + ${enteredW} ${dimUnit}) ÷ 304.8 × ${quantity} → ${decMeasure.toFixed(3)} R.ft × ₹${rate}`;
      }
    } else if (basis === "Cubic Ft") {
      if (hMm <= 0 || wMm <= 0 || dMm <= 0) errors.push("Length, width and thickness/depth in mm are required for Cubic Ft.");
      // In inches: L_in * W_in * D_in / 1728
      // In mm: L_mm * W_mm * D_mm / 28316846.592
      let decMeasure;
      if (dimUnit === "in") {
        decMeasure = new Decimal(enteredH).times(enteredW).times(enteredD).dividedBy(1728).times(quantity);
      } else {
        decMeasure = new Decimal(hMm).times(wMm).times(dMm).dividedBy(CUBIC_FOOT_MM).times(quantity);
      }
      measure = decMeasure.toNumber();
      measureLabel = `${decMeasure.toFixed(3)} Cubic Ft`;
      stepFormula = `${enteredH} × ${enteredW} × ${enteredD} ${dimUnit} → ${decMeasure.toFixed(4)} cu ft × ₹${rate}`;
    } else {
      // Per Piece
      measure = quantity;
      measureLabel = `${quantity} Pcs`;
      stepFormula = `${quantity} Pcs × ₹${rate}`;
    }

    // Manual override support for measure
    if (item.measureOverride != null && Number.isFinite(Number(item.measureOverride))) {
      measure = Number(item.measureOverride);
      measureLabel = `${measure.toFixed(3)} ${basis}`;
      stepFormula = `Manually entered ${measureLabel} × ₹${rate}`;
    }

    // Financial arithmetic with Decimal.js
    const decRate = new Decimal(rate);
    const decMeasureVal = new Decimal(measure);
    const decGross = roundHalfUp(decMeasureVal.times(decRate), 2);
    const grossAmount = decGross.toNumber();

    let discountAmount = 0;
    let taxableAmount = grossAmount;
    if (discountPercent > 0) {
      const decDisc = roundHalfUp(decGross.times(new Decimal(discountPercent).dividedBy(100)), 2);
      discountAmount = decDisc.toNumber();
      taxableAmount = decGross.minus(decDisc).toNumber();
    }

    // Manual taxable amount override
    if (item.taxableAmountOverride != null && Number.isFinite(Number(item.taxableAmountOverride))) {
      taxableAmount = Number(item.taxableAmountOverride);
      discountAmount = Math.max(0, grossAmount - taxableAmount);
      discountPercent = grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0;
    }

    const decTaxable = new Decimal(taxableAmount);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let taxAmount = 0;

    if (item.taxAmountOverride != null && Number.isFinite(Number(item.taxAmountOverride))) {
      taxAmount = Number(item.taxAmountOverride);
      if (taxableAmount > 0) {
        gstRate = (taxAmount / taxableAmount) * 100;
      }
      if (isKarnataka) {
        cgst = roundHalfUp(new Decimal(taxAmount).dividedBy(2), 2).toNumber();
        sgst = roundHalfUp(new Decimal(taxAmount).dividedBy(2), 2).toNumber();
      } else {
        igst = taxAmount;
      }
    } else {
      if (isKarnataka) {
        const halfRate = new Decimal(gstRate).dividedBy(2);
        const decCgst = roundHalfUp(decTaxable.times(halfRate).dividedBy(100), 2);
        const decSgst = roundHalfUp(decTaxable.times(halfRate).dividedBy(100), 2);
        cgst = decCgst.toNumber();
        sgst = decSgst.toNumber();
        taxAmount = roundHalfUp(decCgst.plus(decSgst), 2).toNumber();
      } else {
        const decIgst = roundHalfUp(decTaxable.times(new Decimal(gstRate).dividedBy(100)), 2);
        igst = decIgst.toNumber();
        taxAmount = igst;
      }
    }

    const lineTotal = roundHalfUp(decTaxable.plus(new Decimal(taxAmount)), 2).toNumber();

    // Complete explanation string (Requirement G)
    let explanation = "";
    if (errors.length === 0) {
      explanation = `${stepFormula} = ₹${grossAmount.toFixed(2)}`;
      if (discountPercent > 0) {
        explanation += ` − ${discountPercent}% discount = ₹${taxableAmount.toFixed(2)}`;
      }
      explanation += ` + ${gstRate}% GST`;
    }

    const warnings = checkSanity({
      ...item,
      unit: basis,
      dimensionUnit: dimUnit,
      enteredHeight: enteredH,
      enteredWidth: enteredW,
      enteredThickness: enteredD,
      heightMm: hMm,
      widthMm: wMm,
      thicknessMm: dMm,
      quantity,
      rate,
      discountPercent
    });

    const chartH = chartLookup(hMm);
    const chartW = chartLookup(wMm);
    const isInch = dimUnit === "in" || (!item.dimensionUnit && enteredH <= 120 && enteredW <= 120 && enteredD <= 120);

    return {
      ...item,
      chartH,
      chartW,
      isInch,
      unit: basis,
      basis,
      dimensionUnit: dimUnit,
      enteredHeight: enteredH,
      enteredWidth: enteredW,
      enteredThickness: enteredD,
      height: enteredH,
      width: enteredW,
      thickness: enteredD,
      heightMm: hMm,
      widthMm: wMm,
      thicknessMm: dMm,
      billedHeightMm: billedHMm,
      billedWidthMm: billedWMm,
      billedThicknessMm: billedDMm,
      round3Inch,
      quantity,
      rate,
      discountPercent,
      gstRate,
      measure,
      measureLabel,
      grossAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      cgst,
      sgst,
      igst,
      amount: taxableAmount,
      lineTotal,
      explanation,
      warnings,
      errors
    };
  }

  // Calculate totals across all items for a document
  function calculateTotals(items, state = "Karnataka") {
    const isKarnataka = state === "Karnataka";
    const lines = items.map(it => calculateLine({ ...it, state: it.state || state }));

    let grossSubtotalDec = new Decimal(0);
    let discountTotalDec = new Decimal(0);
    let subtotalDec = new Decimal(0);
    let cgstDec = new Decimal(0);
    let sgstDec = new Decimal(0);
    let igstDec = new Decimal(0);
    let taxTotalDec = new Decimal(0);

    const taxBreakdownMap = new Map();

    lines.forEach(line => {
      grossSubtotalDec = grossSubtotalDec.plus(line.grossAmount);
      discountTotalDec = discountTotalDec.plus(line.discountAmount);
      subtotalDec = subtotalDec.plus(line.taxableAmount);
      cgstDec = cgstDec.plus(line.cgst);
      sgstDec = sgstDec.plus(line.sgst);
      igstDec = igstDec.plus(line.igst);
      taxTotalDec = taxTotalDec.plus(line.taxAmount);

      const rateKey = Number(line.gstRate).toFixed(2);
      if (!taxBreakdownMap.has(rateKey)) {
        taxBreakdownMap.set(rateKey, {
          rate: Number(line.gstRate),
          taxableAmount: 0,
          taxAmount: 0
        });
      }
      const entry = taxBreakdownMap.get(rateKey);
      entry.taxableAmount = roundHalfUp(new Decimal(entry.taxableAmount).plus(line.taxableAmount)).toNumber();
      entry.taxAmount = roundHalfUp(new Decimal(entry.taxAmount).plus(line.taxAmount)).toNumber();
    });

    const grossSubtotal = roundHalfUp(grossSubtotalDec, 2).toNumber();
    const discountTotal = roundHalfUp(discountTotalDec, 2).toNumber();
    const subtotal = roundHalfUp(subtotalDec, 2).toNumber();
    const cgst = roundHalfUp(cgstDec, 2).toNumber();
    const sgst = roundHalfUp(sgstDec, 2).toNumber();
    const igst = roundHalfUp(igstDec, 2).toNumber();
    const taxTotal = roundHalfUp(taxTotalDec, 2).toNumber();

    const unroundedTotal = roundHalfUp(new Decimal(subtotal).plus(taxTotal), 2).toNumber();
    const payable = Math.round(unroundedTotal);
    const roundOff = roundHalfUp(new Decimal(payable).minus(unroundedTotal), 2).toNumber();

    const taxBreakdown = Array.from(taxBreakdownMap.values()).sort((a, b) => a.rate - b.rate);

    return {
      lines,
      grossSubtotal,
      discountTotal,
      subtotal,
      cgst,
      sgst,
      igst,
      taxTotal,
      taxBreakdown,
      unroundedTotal,
      roundOff,
      payable
    };
  }

  function chartLookup(mm) {
    const val = Number(mm) || 0;
    if (val > 7620) {
      const inch = Math.ceil(val / 25.4 / 3 - 0.000001) * 3;
      return { inch, mm: Number((inch * 25.4).toFixed(1)) };
    }
    let chart = typeof SIZE_CHART !== "undefined" ? SIZE_CHART : (typeof globalThis !== "undefined" && globalThis.SIZE_CHART ? globalThis.SIZE_CHART : null);
    if (!chart && typeof require === "function") {
      try { chart = require("./size-chart.js").SIZE_CHART; } catch (e) {}
    }
    if (!chart || !chart.length) {
      const inch = Math.max(3, Math.ceil(val / 25.4 / 3 - 0.000001) * 3);
      return { inch, mm: Number((inch * 25.4).toFixed(1)) };
    }
    if (val < 76.2) {
      return { inch: chart[0].inch, mm: Number(chart[0].mm.toFixed(1)) };
    }
    const found = chart.find(row => row.mm >= val - 0.05);
    const row = found || chart[chart.length - 1];
    return { inch: row.inch, mm: Number(row.mm.toFixed(1)) };
  }

  return {
    MM_PER_FOOT,
    MM_PER_INCH,
    SQFT_MM,
    CUBIC_FOOT_MM,
    THREE_INCH_MM,
    CONVERSION_FACTORS_TO_MM,
    normalizeUnit,
    normalizeBasis,
    toMm,
    fromMm,
    round3InchMm,
    roundHalfUp,
    formatMoney,
    formatIndianWords,
    formatUnitPreview,
    checkSanity,
    calculateLine,
    calculateTotals,
    chartLookup
  };
});
