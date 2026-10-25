(function (root, factory) {
  const calc = typeof GlassCareCalc !== "undefined"
    ? GlassCareCalc
    : (typeof require === "function" ? require("./calc.js") : null);
  const api = factory(calc);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GlassCareCalculations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (calc) {
  "use strict";
  return calc;
});
