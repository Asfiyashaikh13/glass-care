(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GlassCareCalculations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MM_PER_FOOT = 304.8;
  const SQFT_MM = 92903.04;
  const CUBIC_FOOT_MM = MM_PER_FOOT ** 3;

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
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

  function calculateLine(item) {
    const unit = item.unit || "Sqft";
    const length = finiteNumber(item.height);
    const width = finiteNumber(item.width);
    const thickness = finiteNumber(item.thickness);
    const quantity = finiteNumber(item.quantity, 0);
    const rate = finiteNumber(item.rate, 0);
    const discountPercent = finiteNumber(item.discountPercent ?? 0);
    const gstRate = finiteNumber(item.gstRate ?? 18);
    const errors = [];

    if (quantity < 1) errors.push("Quantity must be at least 1.");
    if (item.quantity == null || item.quantity === "") errors.push("Quantity is required.");
    if (item.rate == null || item.rate === "") errors.push("Rate is required.");
    if (rate < 0) errors.push("Rate cannot be negative.");
    if (discountPercent < 0 || discountPercent > 100) errors.push("Discount must be between 0 and 100%.");
    if (gstRate < 0 || gstRate > 100) errors.push("GST rate must be between 0 and 100%.");

    let measure = quantity;
    let measureLabel = `${quantity} ${unit}`;
    let formula = "Quantity × rate";
    let chartH = null;
    let chartW = null;
    let isInch = item.dimensionUnit === "in";

    if (unit === "Sqft") {
      if (length <= 0 || width <= 0) errors.push("Length and width in mm are required for Sqft.");
      chartH = chartLookup(length);
      chartW = chartLookup(width);
      const heightFt = chartH.inch / 12;
      const widthFt = chartW.inch / 12;
      measure = (length <= 0 || width <= 0) ? 0 : heightFt * widthFt * quantity;
      measureLabel = `${measure.toFixed(3)} Sqft`;
      formula = `${chartH.mm.toFixed(1)} mm (${chartH.inch} in) ÷ 12 × ${chartW.mm.toFixed(1)} mm (${chartW.inch} in) ÷ 12 × ${quantity} × ₹${rate}`;
    } else if (unit === "R.ft") {
      if (length <= 0 || width <= 0) errors.push("Length and width in mm are required for running feet.");
      measure = 2 * (length + width) * quantity / MM_PER_FOOT;
      measureLabel = `${measure.toFixed(2)} R.ft`;
      formula = `2 × (${length} mm + ${width} mm) × ${quantity} ÷ ${MM_PER_FOOT} × ₹${rate}`;
    } else if (unit === "Cubic Ft") {
      if (length <= 0 || width <= 0 || thickness <= 0) errors.push("Length, width and thickness/depth in mm are required for Cubic Ft.");
      isInch = item.dimensionUnit === "in" || (!item.dimensionUnit && length <= 120 && width <= 120 && thickness <= 120);
      if (isInch) {
        measure = (length > 0 && width > 0 && thickness > 0) ? (length * width * thickness * quantity / 1728) : 0;
        measureLabel = `${measure.toFixed(3)} Cubic Ft`;
        formula = `${length} in × ${width} in × ${thickness} in × ${quantity} ÷ 1,728 × ₹${rate}`;
      } else {
        measure = (length > 0 && width > 0 && thickness > 0) ? (length * width * thickness * quantity / CUBIC_FOOT_MM) : 0;
        measureLabel = `${measure.toFixed(3)} Cubic Ft`;
        formula = `${length} mm × ${width} mm × ${thickness} mm × ${quantity} ÷ ${CUBIC_FOOT_MM} × ₹${rate}`;
      }
    } else if (!["Pcs", "Job"].includes(unit)) {
      errors.push("Select a supported unit.");
    }

    if (item.measureOverride != null && Number.isFinite(Number(item.measureOverride))) {
      const override = Number(item.measureOverride);
      if (override < 0) errors.push("Area, running feet, or volume cannot be negative.");
      else {
        measure = override;
        measureLabel = `${measure.toFixed(unit === "R.ft" ? 2 : 3)} ${unit === "Sqft" ? "Sqft" : unit === "R.ft" ? "R.ft" : unit === "Cubic Ft" ? "Cubic Ft" : unit}`;
        formula = `Manually entered ${measureLabel} × ₹${rate}`;
      }
    }

    const grossAmount = errors.length ? 0 : measure * rate;
    let discountAmount = errors.length ? 0 : grossAmount * discountPercent / 100;
    let effectiveDiscountPercent = discountPercent;
    let taxableAmount = grossAmount - discountAmount;
    let taxAmount = taxableAmount * gstRate / 100;
    let effectiveGstRate = gstRate;

    if (item.taxableAmountOverride != null && Number.isFinite(Number(item.taxableAmountOverride))) {
      const override = Number(item.taxableAmountOverride);
      if (override < 0 || override > grossAmount) errors.push("Taxable amount override must be between zero and the gross item amount.");
      else {
        taxableAmount = override;
        discountAmount = grossAmount - taxableAmount;
        effectiveDiscountPercent = grossAmount ? discountAmount / grossAmount * 100 : 0;
        taxAmount = taxableAmount * gstRate / 100;
      }
    }
    if (item.taxAmountOverride != null && Number.isFinite(Number(item.taxAmountOverride))) {
      const override = Number(item.taxAmountOverride);
      if (override < 0) errors.push("Tax amount cannot be negative.");
      else {
        taxAmount = override;
        effectiveGstRate = taxableAmount ? taxAmount / taxableAmount * 100 : 0;
        if (effectiveGstRate > 100) errors.push("The tax amount would produce a GST rate over 100%.");
      }
    }

    return {
      ...item,
      quantity,
      rate,
      unit,
      height: length,
      width,
      thickness,
      isInch: !!isInch,
      chartH,
      chartW,
      gstRate: effectiveGstRate,
      measure,
      measureLabel,
      grossAmount: errors.length ? 0 : grossAmount,
      discountAmount: errors.length ? 0 : discountAmount,
      discountPercent: effectiveDiscountPercent,
      taxableAmount: errors.length ? 0 : taxableAmount,
      taxAmount: errors.length ? 0 : taxAmount,
      amount: errors.length ? 0 : taxableAmount,
      errors,
      formula
    };
  }

  function calculateTotals(items, state) {
    const lines = items.map(calculateLine);
    const grossSubtotal = Math.round(lines.reduce((sum, line) => sum + line.grossAmount, 0) * 100) / 100;
    const discountTotal = Math.round(lines.reduce((sum, line) => sum + line.discountAmount, 0) * 100) / 100;
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.taxableAmount, 0) * 100) / 100;
    const intraState = state === "Karnataka";
    const taxBreakdown = [...lines.reduce((groups, line) => {
      const rate = Number(line.gstRate.toFixed(6));
      const group = groups.get(rate) || { rate, taxableAmount: 0, taxAmount: 0 };
      group.taxableAmount += line.taxableAmount;
      group.taxAmount += line.taxAmount;
      groups.set(rate, group);
      return groups;
    }, new Map()).values()].sort((a, b) => a.rate - b.rate).map(group => {
      const taxable = Math.round(group.taxableAmount * 100) / 100;
      if (intraState) {
        const halfTax = Math.round((taxable * (group.rate / 2) / 100) * 100) / 100;
        return {
          rate: group.rate,
          taxableAmount: taxable,
          taxAmount: halfTax * 2
        };
      } else {
        const igst = Math.round((taxable * group.rate / 100) * 100) / 100;
        return {
          rate: group.rate,
          taxableAmount: taxable,
          taxAmount: igst
        };
      }
    });

    const taxTotal = Math.round(taxBreakdown.reduce((sum, g) => sum + g.taxAmount, 0) * 100) / 100;
    const cgst = intraState ? Math.round((taxTotal / 2) * 100) / 100 : 0;
    const sgst = intraState ? Math.round((taxTotal / 2) * 100) / 100 : 0;
    const igst = intraState ? 0 : taxTotal;

    const unroundedTotal = Math.round((subtotal + taxTotal) * 100) / 100;
    const payable = Math.round(unroundedTotal);
    let roundOff = Math.round((payable - unroundedTotal) * 100) / 100;
    if (Math.abs(roundOff) < 0.0001 || Object.is(roundOff, -0)) {
      roundOff = 0;
    }

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

  function formatMoney(value, decimals = 2) {
    const num = finiteNumber(value);
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    if (num < -0.0001) {
      return `-₹${formatted}`;
    }
    return `₹${formatted}`;
  }

  // Console-only self-test for Sqft size chart integration
  try {
    const selfTestCases = [
      {
        desc: "1800 x 1200 mm -> 72 x 48 in -> 24.000 Sqft",
        run: () => {
          const h = chartLookup(1800), w = chartLookup(1200);
          const sqft = (h.inch / 12) * (w.inch / 12);
          return h.inch === 72 && w.inch === 48 && sqft.toFixed(3) === "24.000";
        }
      },
      {
        desc: "1200 x 1000 mm -> 48 x 42 in -> 14.000 Sqft",
        run: () => {
          const h = chartLookup(1200), w = chartLookup(1000);
          const sqft = (h.inch / 12) * (w.inch / 12);
          return h.inch === 48 && w.inch === 42 && sqft.toFixed(3) === "14.000";
        }
      },
      {
        desc: "2000 x 916 mm -> 81 x 39 in -> 21.938 Sqft",
        run: () => {
          const h = chartLookup(2000), w = chartLookup(916);
          const sqft = (h.inch / 12) * (w.inch / 12);
          return h.inch === 81 && w.inch === 39 && sqft.toFixed(3) === "21.938";
        }
      },
      {
        desc: "520 x 425 mm -> 21 x 18 in -> 2.625 Sqft",
        run: () => {
          const h = chartLookup(520), w = chartLookup(425);
          const sqft = (h.inch / 12) * (w.inch / 12);
          return h.inch === 21 && w.inch === 18 && sqft.toFixed(3) === "2.625";
        }
      },
      {
        desc: "1828.8 x 1219.2 mm -> unchanged (72 x 48 in)",
        run: () => {
          const h = chartLookup(1828.8), w = chartLookup(1219.2);
          return h.inch === 72 && w.inch === 48 && Math.abs(h.mm - 1828.8) < 0.001 && Math.abs(w.mm - 1219.2) < 0.001;
        }
      },
      {
        desc: "1830 mm -> 75 in (1905 mm)",
        run: () => {
          const h = chartLookup(1830);
          return h.inch === 75 && Math.abs(h.mm - 1905) < 0.001;
        }
      }
    ];

    selfTestCases.forEach(t => {
      const ok = t.run();
      console.log(`[Sqft Self-Test] ${t.desc}: ${ok ? "PASS" : "FAIL"}`);
    });
  } catch (err) {
    console.warn("Sqft self-test skipped:", err);
  }

  return { MM_PER_FOOT, SQFT_MM, CUBIC_FOOT_MM, chartLookup, calculateLine, calculateTotals, formatMoney };
});
