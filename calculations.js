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
    if (unit === "Sqft") {
      if (length <= 0 || width <= 0) errors.push("Length and width in mm are required for Sqft.");
      measure = length * width * quantity / SQFT_MM;
      measureLabel = `${measure.toFixed(3)} Sqft`;
      formula = `${length} mm × ${width} mm × ${quantity} ÷ ${SQFT_MM} × ₹${rate}`;
    } else if (unit === "R.ft") {
      if (length <= 0 || width <= 0) errors.push("Length and width in mm are required for running feet.");
      measure = 2 * (length + width) * quantity / MM_PER_FOOT;
      measureLabel = `${measure.toFixed(2)} R.ft`;
      formula = `2 × (${length} mm + ${width} mm) × ${quantity} ÷ ${MM_PER_FOOT} × ₹${rate}`;
    } else if (unit === "Cubic Ft") {
      if (length <= 0 || width <= 0 || thickness <= 0) errors.push("Length, width and thickness/depth in mm are required for Cubic Ft.");
      measure = length * width * thickness * quantity / CUBIC_FOOT_MM;
      measureLabel = `${measure.toFixed(3)} Cubic Ft`;
      formula = `${length} mm × ${width} mm × ${thickness} mm × ${quantity} ÷ ${CUBIC_FOOT_MM} × ₹${rate}`;
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
    const grossSubtotal = lines.reduce((sum, line) => sum + line.grossAmount, 0);
    const discountTotal = lines.reduce((sum, line) => sum + line.discountAmount, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.taxableAmount, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const intraState = state === "Karnataka";
    const cgst = intraState ? taxTotal / 2 : 0;
    const sgst = intraState ? taxTotal / 2 : 0;
    const igst = intraState ? 0 : taxTotal;
    const taxBreakdown = [...lines.reduce((groups, line) => {
      const rate = Number(line.gstRate.toFixed(6));
      const group = groups.get(rate) || { rate, taxableAmount: 0, taxAmount: 0 };
      group.taxableAmount += line.taxableAmount;
      group.taxAmount += line.taxAmount;
      groups.set(rate, group);
      return groups;
    }, new Map()).values()].sort((a, b) => a.rate - b.rate);
    const unroundedTotal = subtotal + taxTotal;
    const payable = Math.floor(unroundedTotal + 0.5);
    const roundOff = payable - unroundedTotal;

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
    return `₹${finiteNumber(value).toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  }

  return { MM_PER_FOOT, SQFT_MM, CUBIC_FOOT_MM, calculateLine, calculateTotals, formatMoney };
});
