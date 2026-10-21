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
