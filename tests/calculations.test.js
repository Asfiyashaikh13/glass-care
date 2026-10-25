const test = require("node:test");
const assert = require("node:assert/strict");
const calculations = require("../calculations.js");

const line = overrides => ({
  category: "Test glass",
  unit: "Pcs",
  quantity: 1,
  rate: 0,
  discountPercent: 0,
  gstRate: 0,
  ...overrides
});

test("rounds ₹12,557.03 down to ₹12,557", () => {
  assert.equal(calculations.calculateTotals([line({ rate: 12557.03 })], "Tamil Nadu").payable, 12557);
});

test("rounds ₹12,557.50 up to ₹12,558", () => {
  assert.equal(calculations.calculateTotals([line({ rate: 12557.5 })], "Tamil Nadu").payable, 12558);
});

test("converts dimensions in millimetres to square feet", () => {
  const result = calculations.calculateLine(line({ unit: "Sqft", height: 304.8, width: 304.8, rate: 100 }));
  assert.ok(Math.abs(result.measure - 1) < 1e-12);
  assert.ok(Math.abs(result.amount - 100) < 1e-10);
  assert.deepEqual(result.errors, []);
});

test("requires all dimensions and converts cubic millimetres to cubic feet", () => {
  const incomplete = calculations.calculateLine(line({ unit: "Cubic Ft", height: 304.8, width: 304.8, rate: 100 }));
  assert.match(incomplete.errors.join(" "), /thickness\/depth/);
  const complete = calculations.calculateLine(line({ unit: "Cubic Ft", height: 304.8, width: 304.8, thickness: 304.8, rate: 100 }));
  assert.equal(complete.measure, 1);
  assert.equal(complete.amount, 100);
});

test("applies discount before GST and splits Karnataka tax", () => {
  const totals = calculations.calculateTotals([line({ unit: "Pcs", rate: 1000, discountPercent: 10, gstRate: 18 })], "Karnataka");
  assert.equal(totals.subtotal, 900);
  assert.equal(totals.cgst, 81);
  assert.equal(totals.sgst, 81);
  assert.equal(totals.igst, 0);
  assert.equal(totals.payable, 1062);
});

test("uses IGST only for interstate transactions", () => {
  const totals = calculations.calculateTotals([line({ rate: 1000, gstRate: 18 })], "Tamil Nadu");
  assert.equal(totals.igst, 180);
  assert.equal(totals.cgst, 0);
  assert.equal(totals.sgst, 0);
});

test("keeps different GST rates separate in the tax breakdown", () => {
  const totals = calculations.calculateTotals([
    line({ rate: 1000, gstRate: 5 }),
    line({ rate: 1000, gstRate: 18 })
  ], "Karnataka");
  assert.deepEqual(totals.taxBreakdown, [
    { rate: 5, taxableAmount: 1000, taxAmount: 50 },
    { rate: 18, taxableAmount: 1000, taxAmount: 180 }
  ]);
});

test("edits recalculate item amounts and totals from source values", () => {
  const initial = calculations.calculateTotals([line({ rate: 500, gstRate: 18 })], "Tamil Nadu");
  const edited = calculations.calculateTotals([line({ rate: 700, gstRate: 18 })], "Tamil Nadu");
  assert.equal(initial.payable, 590);
  assert.equal(edited.payable, 826);
  assert.equal(initial.lines[0].rate, 500);
});

test("manual taxable amount updates the implied discount and tax", () => {
  const result = calculations.calculateLine(line({
    unit: "Pcs", rate: 1000, gstRate: 18, taxableAmountOverride: 800
  }));
  assert.equal(result.discountAmount, 200);
  assert.equal(result.discountPercent, 20);
  assert.equal(result.taxAmount, 144);
});

test("manual tax amount updates the implied GST rate", () => {
  const result = calculations.calculateLine(line({
    unit: "Pcs", rate: 1000, discountPercent: 10, gstRate: 18,
    taxAmountOverride: 80
  }));
  assert.equal(result.taxableAmount, 900);
  assert.equal(result.gstRate, 80 / 900 * 100);
  assert.equal(result.taxAmount, 80);
});

test("calculates exact 2-decimal round off without float drift and formats money correctly", () => {
  const totalsDown = calculations.calculateTotals([line({ rate: 12557.03 })], "Tamil Nadu");
  assert.equal(totalsDown.unroundedTotal, 12557.03);
  assert.equal(totalsDown.payable, 12557);
  assert.equal(totalsDown.roundOff, -0.03);
  assert.equal(calculations.formatMoney(totalsDown.roundOff), "-₹0.03");

  const totalsUp = calculations.calculateTotals([line({ rate: 100.40 })], "Tamil Nadu");
  assert.equal(totalsUp.unroundedTotal, 100.40);
  assert.equal(totalsUp.payable, 100);
  assert.equal(totalsUp.roundOff, -0.40);
  assert.equal(calculations.formatMoney(totalsUp.roundOff), "-₹0.40");

  const totalsPos = calculations.calculateTotals([line({ rate: 100.60 })], "Tamil Nadu");
  assert.equal(totalsPos.unroundedTotal, 100.60);
  assert.equal(totalsPos.payable, 101);
  assert.equal(totalsPos.roundOff, 0.40);
  assert.equal(calculations.formatMoney(totalsPos.roundOff), "₹0.40");
});

test("balances CGST/SGST split and round off to the exact rupee without 1-paisa drift", () => {
  const totals = calculations.calculateTotals([line({ unit: "Pcs", rate: 3487.51, gstRate: 18 })], "Karnataka");
  assert.equal(totals.subtotal, 3487.51);
  assert.equal(totals.cgst, 313.88);
  assert.equal(totals.sgst, 313.88);
  assert.equal(totals.taxTotal, 627.76);
  assert.equal(totals.unroundedTotal, 4115.27);
  assert.equal(totals.payable, 4115);
  assert.equal(totals.roundOff, -0.27);
  assert.equal(totals.subtotal + totals.cgst + totals.sgst + totals.roundOff, totals.payable);
});

test("maps GSTIN state codes to correct Indian states", () => {
  const data = require("../data.js");
  assert.equal(data.GST_STATE_CODE_MAP["29"], "Karnataka");
  assert.equal(data.GST_STATE_CODE_MAP["27"], "Maharashtra");
  assert.equal(data.GST_STATE_CODE_MAP["33"], "Tamil Nadu");
  assert.equal(data.GST_STATE_CODE_MAP["07"], "Delhi");
  assert.equal(data.GST_STATE_CODE_MAP["24"], "Gujarat");
  assert.equal(data.GST_STATE_CODE_MAP["36"], "Telangana");
});

test("validates 15-character Indian GSTIN structure correctly", () => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  assert.ok(gstinRegex.test("29ABCDE1234F1Z5"));
  assert.ok(gstinRegex.test("27AAGCW7302R1ZF"));
  assert.ok(!gstinRegex.test("29ABCDE1234F")); // too short
  assert.ok(!gstinRegex.test("ABCDE1234F1Z529")); // wrong order
});

test("calculates Sqft using client size chart 3-inch step", () => {
  const c1 = calculations.calculateLine(line({ unit: "Sqft", height: 1800, width: 1200, quantity: 1, rate: 100 }));
  assert.equal(c1.chartH.inch, 72);
  assert.equal(c1.chartW.inch, 48);
  assert.equal(c1.measure.toFixed(3), "24.000");

  const c2 = calculations.calculateLine(line({ unit: "Sqft", height: 1200, width: 1000, quantity: 1, rate: 100 }));
  assert.equal(c2.chartH.inch, 48);
  assert.equal(c2.chartW.inch, 42);
  assert.equal(c2.measure.toFixed(3), "14.000");

  const c3 = calculations.calculateLine(line({ unit: "Sqft", height: 2000, width: 916, quantity: 1, rate: 100 }));
  assert.equal(c3.chartH.inch, 81);
  assert.equal(c3.chartW.inch, 39);
  assert.equal(c3.measure.toFixed(3), "21.938");

  const c4 = calculations.calculateLine(line({ unit: "Sqft", height: 520, width: 425, quantity: 1, rate: 100 }));
  assert.equal(c4.chartH.inch, 21);
  assert.equal(c4.chartW.inch, 18);
  assert.equal(c4.measure.toFixed(3), "2.625");

  const c5 = calculations.calculateLine(line({ unit: "Sqft", height: 1828.8, width: 1219.2, quantity: 1, rate: 100 }));
  assert.equal(c5.chartH.inch, 72);
  assert.equal(c5.chartW.inch, 48);
  assert.equal(c5.chartH.mm, 1828.8);
  assert.equal(c5.chartW.mm, 1219.2);

  const c6 = calculations.chartLookup(1830);
  assert.equal(c6.inch, 75);
  assert.equal(c6.mm, 1905);
});

test("preserves thickness for Sqft and depth for Cubic Ft", () => {
  const sqftItem = calculations.calculateLine(line({ unit: "Sqft", height: 1800, width: 1200, thickness: 12, rate: 100 }));
  assert.equal(sqftItem.thickness, 12);
  assert.equal(sqftItem.measure, 24);

  const cftItem = calculations.calculateLine(line({ unit: "Cubic Ft", height: 609.6, width: 609.6, thickness: 304.8, rate: 200 }));
  assert.equal(cftItem.thickness, 304.8);
  assert.equal(cftItem.measure, 4);
  assert.equal(cftItem.amount, 800);
});

test("calculates Cubic Ft from inches (e.g. 12x12x12 in = 1 CFT)", () => {
  const cftInch = calculations.calculateLine(line({ unit: "Cubic Ft", height: 12, width: 12, thickness: 12, rate: 400, discountPercent: 10 }));
  assert.equal(cftInch.isInch, true);
  assert.equal(cftInch.measure, 1);
  assert.equal(cftInch.grossAmount, 400);
  assert.equal(cftInch.taxableAmount, 360);
  assert.equal(cftInch.amount, 360);
});

// REQUIRED TESTS FROM SPECIFICATION
test("spec: 13 x 13 x 18 in, Cubic Ft, Qty 1, Rate 800, Disc 10% -> volume 1.7604, amount 1,267.50", () => {
  const res = calculations.calculateLine(line({
    dimensionUnit: "in",
    height: 13,
    width: 13,
    thickness: 18,
    unit: "Cubic Ft",
    quantity: 1,
    rate: 800,
    discountPercent: 10
  }));
  assert.equal(res.measure.toFixed(4), "1.7604");
  assert.equal(res.grossAmount.toFixed(2), "1408.33");
  assert.equal(res.discountAmount.toFixed(2), "140.83");
  assert.equal(res.taxableAmount.toFixed(2), "1267.50");
  assert.equal(res.amount.toFixed(2), "1267.50");
});

test("spec: 12 x 13 x 118 in, Cubic Ft, Qty 1, Rate 300, Disc 10% -> volume 10.653, gross 3,195.83, discount 319.58, taxable 2,876.25, CGST 258.86, SGST 258.86, total 3,393.97, payable 3,394.00, triggers depth warning", () => {
  const item = {
    dimensionUnit: "in",
    height: 12,
    width: 13,
    thickness: 118,
    unit: "Cubic Ft",
    quantity: 1,
    rate: 300,
    discountPercent: 10,
    gstRate: 18,
    state: "Karnataka"
  };
  const totals = calculations.calculateTotals([item], "Karnataka");
  const row = totals.lines[0];

  assert.equal(row.measure.toFixed(3), "10.653");
  assert.equal(row.grossAmount.toFixed(2), "3195.83");
  assert.equal(row.discountAmount.toFixed(2), "319.58");
  assert.equal(row.taxableAmount.toFixed(2), "2876.25");
  assert.equal(totals.cgst.toFixed(2), "258.86");
  assert.equal(totals.sgst.toFixed(2), "258.86");
  assert.equal(totals.unroundedTotal.toFixed(2), "3393.97");
  assert.equal(totals.payable.toFixed(2), "3394.00");
  assert.ok(row.warnings.some(w => /depth|thickness/i.test(w) && /300 mm/i.test(w)), "Expected depth warning");
});

test("spec: 1800 x 1200 mm, Sq Ft, Qty 1 -> 23.250 sq ft; with 3-inch rounding -> 1828.8 x 1219.2 -> 24.000 sq ft", () => {
  const unrounded = calculations.calculateLine(line({
    dimensionUnit: "mm",
    height: 1800,
    width: 1200,
    unit: "Sq Ft",
    quantity: 1,
    round3Inch: false
  }));
  assert.equal(unrounded.measure.toFixed(3), "23.250");

  const rounded = calculations.calculateLine(line({
    dimensionUnit: "mm",
    height: 1800,
    width: 1200,
    unit: "Sq Ft",
    quantity: 1,
    round3Inch: true
  }));
  assert.equal(rounded.billedHeightMm, 1828.8);
  assert.equal(rounded.billedWidthMm, 1219.2);
  assert.equal(rounded.measure.toFixed(3), "24.000");
});

test("spec: 1850 x 415 mm, 3-inch rounding -> 1905 x 457.2, Sq Ft 9.375, at Rate 565 -> 5,296.88", () => {
  const res = calculations.calculateLine(line({
    dimensionUnit: "mm",
    height: 1850,
    width: 415,
    unit: "Sq Ft",
    quantity: 1,
    rate: 565,
    round3Inch: true
  }));
  assert.equal(res.billedHeightMm, 1905);
  assert.equal(res.billedWidthMm, 457.2);
  assert.equal(res.measure.toFixed(3), "9.375");
  assert.equal(res.grossAmount.toFixed(2), "5296.88");
});

test("spec: Running Ft: 1371.6 x 533.4 mm, Qty 2 -> 25.000", () => {
  const res = calculations.calculateLine(line({
    dimensionUnit: "mm",
    height: 1371.6,
    width: 533.4,
    unit: "Running Ft",
    quantity: 2,
    round3Inch: false
  }));
  assert.equal(res.measure.toFixed(3), "25.000");
});

test("spec: Unit conversion round trips (in, cm, ft, mm) and unit-mismatch warning", () => {
  assert.equal(calculations.toMm(1, "in"), 25.4);
  assert.equal(calculations.toMm(1, "cm"), 10);
  assert.equal(calculations.toMm(1, "ft"), 304.8);
  assert.equal(calculations.toMm(1, "mm"), 1);

  assert.equal(calculations.fromMm(25.4, "in"), 1);
  assert.equal(calculations.fromMm(10, "cm"), 1);
  assert.equal(calculations.fromMm(304.8, "ft"), 1);
  assert.equal(calculations.fromMm(1, "mm"), 1);

  // Unit mismatch warning: unit is Inches and size > 500
  const warnInches = calculations.checkSanity({
    dimensionUnit: "in",
    height: 550,
    width: 100,
    unit: "Sq Ft"
  });
  assert.ok(warnInches.some(w => /exceeds 500 inches/i.test(w)));

  // Unit mismatch warning: unit is mm and all dimensions < 20
  const warnMm = calculations.checkSanity({
    dimensionUnit: "mm",
    height: 12,
    width: 14,
    unit: "Sq Ft"
  });
  assert.ok(warnMm.some(w => /under 20 mm/i.test(w)));
});

test("spec: 1800 mm and 70.866 in give the same amount", () => {
  const mmItem = calculations.calculateLine(line({
    dimensionUnit: "mm",
    height: 1800,
    width: 1200,
    unit: "Sq Ft",
    quantity: 1,
    rate: 100,
    round3Inch: false
  }));
  const inItem = calculations.calculateLine(line({
    dimensionUnit: "in",
    height: 70.866,
    width: 47.244,
    unit: "Sq Ft",
    quantity: 1,
    rate: 100,
    round3Inch: false
  }));
  assert.equal(mmItem.grossAmount.toFixed(2), inItem.grossAmount.toFixed(2));
});

test("spec: Indian words: 3394 -> 'Rupees Three Thousand Three Hundred Ninety Four Only'", () => {
  assert.equal(calculations.formatIndianWords(3394), "Rupees Three Thousand Three Hundred Ninety Four Only");
});



