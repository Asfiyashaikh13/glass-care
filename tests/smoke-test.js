const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const assert = require("assert");

async function run() {
  const rootDir = path.resolve(__dirname, "..");
  
  // Create a minimal static HTTP server
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/") reqPath = "/index.html";
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png"
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server listening on http://localhost:${port}`);

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForLoadState("networkidle");

    // Reveal app shell for browser testing
    await page.evaluate(() => {
      const appShell = document.getElementById("appShell");
      if (appShell) appShell.hidden = false;
      const authPanel = document.getElementById("authPanel");
      if (authPanel) authPanel.hidden = true;
    });

    // 1. Initial State: Unit is "mm"
    const dimUnitSelect = page.locator("#dimensionUnit");
    await assert.strictEqual(await dimUnitSelect.inputValue(), "mm");

    const heightLabel = page.locator("#heightLabel");
    const heightTextMm = await heightLabel.textContent();
    console.log("Initial height label:", heightTextMm);
    assert.ok(heightTextMm.includes("(mm)"), "Height label should have (mm)");

    // 2. Switch dimension unit to "in"
    await dimUnitSelect.selectOption("in");
    await page.waitForTimeout(100);

    const heightTextIn = await heightLabel.textContent();
    console.log("Switched to 'in', height label:", heightTextIn);
    assert.ok(heightTextIn.includes("(in)"), "Height label should have (in)");

    const widthLabel = page.locator("#widthLabel");
    const widthTextIn = await widthLabel.textContent();
    assert.ok(widthTextIn.includes("(in)"), "Width label should have (in)");

    // 3. Test equivalent sizes give equivalent amounts
    // Uncheck 3-inch rounding for raw size comparison
    const roundToggle = page.locator("#round3InchToggle");
    if (await roundToggle.isChecked()) {
      await roundToggle.uncheck();
    }

    // Enter in inches: 70.866 x 47.244 in (equivalent to 1800 x 1200 mm)
    await page.locator("#height").fill("70.866");
    await page.locator("#width").fill("47.244");
    // Make rate 100, discount 0
    await page.locator("#rate").evaluate(el => { el.removeAttribute("readonly"); el.value = "100"; el.dispatchEvent(new Event("input")); });
    await page.locator("#discountPercent").fill("0");
    await page.waitForTimeout(200);

    const amountInches = await page.locator("#amountDisplay").textContent();
    console.log("Amount for 70.866 x 47.244 in at ₹100:", amountInches);

    // Now switch to mm and enter 1800 x 1200
    await dimUnitSelect.selectOption("mm");
    await page.waitForTimeout(100);
    await page.locator("#height").fill("1800");
    await page.locator("#width").fill("1200");
    await page.waitForTimeout(200);

    const amountMm = await page.locator("#amountDisplay").textContent();
    console.log("Amount for 1800 x 1200 mm at ₹100:", amountMm);
    assert.strictEqual(amountInches, amountMm, "Equivalent sizes in inches and mm must yield identical amounts");

    // 4. Test depth warning for 12 x 13 x 118 in Cubic Ft
    await dimUnitSelect.selectOption("in");
    await page.locator("#unitDisplay").selectOption("Cubic Ft");
    await page.locator("#height").fill("12");
    await page.locator("#width").fill("13");
    await page.locator("#thickness").fill("118");
    await page.waitForTimeout(200);

    const warnBox = page.locator("#sanityWarningContainer");
    const isWarnVisible = await warnBox.isVisible();
    console.log("Sanity warning container visible:", isWarnVisible);
    assert.ok(isWarnVisible, "Sanity warning container should be visible for 118 in depth");

    const warnText = await page.locator("#sanityWarningList").textContent();
    console.log("Warning text:", warnText);
    assert.ok(/exceeds 300 mm/i.test(warnText), "Warning must mention exceeding 300 mm depth");

    // 5. Test Cubic Ft with 3-inch (76.2 mm) rounding: 2290 x 760 x 460 mm -> 2362.2 x 762.0 x 533.4 mm -> 33.906 Cubic Ft
    await dimUnitSelect.selectOption("mm");
    await page.locator("#unitDisplay").selectOption("Cubic Ft");
    if (!(await roundToggle.isChecked())) {
      await roundToggle.check();
    }
    await page.locator("#height").fill("2290");
    await page.locator("#width").fill("760");
    await page.locator("#thickness").fill("460");
    await page.locator("#rate").evaluate(el => { el.removeAttribute("readonly"); el.value = "225"; el.dispatchEvent(new Event("input")); });
    await page.locator("#discountPercent").fill("0");
    await page.waitForTimeout(200);

    const cftDisplay = await page.locator("#areaDisplay").textContent();
    console.log("Cubic feet display for 2290 x 760 x 460 mm with 3-inch rounding:", cftDisplay);
    assert.ok(cftDisplay.includes("33.906"), `Cubic feet should be 33.906 CFT, got ${cftDisplay}`);

    const dimsUsed = await page.locator("#roundedSize").textContent();
    console.log("Dimensions used display:", dimsUsed);
    assert.ok(dimsUsed.includes("2362.2") && dimsUsed.includes("762.0") && dimsUsed.includes("533.4"), "Dimensions used must show rounded 2362.2 x 762.0 x 533.4 mm");

    const amountCft = await page.locator("#amountDisplay").textContent();
    console.log("Payable amount for 33.90625 CFT at ₹225:", amountCft);
    assert.strictEqual(amountCft, "₹7,628.91", "Amount should be ₹7,628.91");

    // 6. Test session and data persistence across page reload / back navigation
    await page.evaluate(() => {
      localStorage.setItem("glassCareCachedUser", JSON.stringify({ id: "user-123", email: "test@example.com" }));
      localStorage.setItem("glassCareDraft", JSON.stringify({
        customerName: "Acme Corporation",
        flatNo: "Suite 404",
        currentItem: { height: "2290", width: "760", thickness: "460" }
      }));
    });
    await page.reload();
    await page.waitForTimeout(300);

    const isAuthVisibleAfterReload = await page.locator("#authPanel").isVisible();
    assert.strictEqual(isAuthVisibleAfterReload, false, "authPanel must stay hidden after reload");
    const isAppShellVisibleAfterReload = await page.locator("#appShell").isVisible();
    assert.strictEqual(isAppShellVisibleAfterReload, true, "appShell must stay visible after reload");
    const restoredCustName = await page.locator("#customerName").inputValue();
    assert.strictEqual(restoredCustName, "Acme Corporation", "Customer name draft must be preserved");

    console.log("All Playwright browser smoke test assertions PASSED!");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error("Playwright smoke test FAILED:", err);
  process.exit(1);
});
