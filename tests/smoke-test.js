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
    page.on("pageerror", err => console.log("PAGE ERROR:", err));
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
    await dimUnitSelect.dispatchEvent("change");
    await page.waitForTimeout(200);

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

    // 7. Test custom Product Category and Item Name addition into dropdowns
    // Select __custom__ on category
    await page.locator("#category").selectOption("__custom__");
    await page.locator("#categoryCustom").fill("Premium Acoustic Soundproof Glass 24mm");
    await page.locator("#categoryCustom").dispatchEvent("change");
    await page.waitForTimeout(100);

    // Verify option is now in category dropdown and selected
    const selectedCategoryVal = await page.locator("#category").inputValue();
    console.log("Newly added category selected in dropdown:", selectedCategoryVal);
    assert.strictEqual(selectedCategoryVal, "Premium Acoustic Soundproof Glass 24mm");

    // Select __custom__ on item name
    await page.locator("#itemName").selectOption("__custom__");
    await page.locator("#itemNameCustom").fill("Heavy Duty Glass Sliding Door Track");
    await page.locator("#itemNameCustom").dispatchEvent("change");
    await page.waitForTimeout(100);

    // Verify option is now in item name dropdown and selected
    const selectedItemVal = await page.locator("#itemName").inputValue();
    console.log("Newly added item name selected in dropdown:", selectedItemVal);
    assert.strictEqual(selectedItemVal, "Heavy Duty Glass Sliding Door Track");

    // Reload page and verify custom options were persisted into the dropdown options
    await page.reload();
    await page.waitForTimeout(300);

    const categoryOptions = await page.locator("#category option").allTextContents();
    assert.ok(categoryOptions.some(opt => opt.includes("Premium Acoustic Soundproof Glass 24mm")), "Custom category must persist in dropdown after reload");

    const itemOptions = await page.locator("#itemName option").allTextContents();
    assert.ok(itemOptions.some(opt => opt.includes("Heavy Duty Glass Sliding Door Track")), "Custom item name must persist in dropdown after reload");
    console.log("Custom category & item name dropdown persistence verified!");

    // 8. Test GSTIN validation and live API mocking with Playwright route interception
    // Set mock API Key in localStorage for testing
    await page.evaluate(() => {
      localStorage.setItem("glassCareGstinApiKey", "test_mock_api_key");
      localStorage.setItem("glassCareGstinProvider", "auto");
    });

    // Intercept standard GSTIN API requests
    await page.route("https://www.gstinapi.in/v1/gstin/**", async (route) => {
      const url = route.request().url();
      if (url.includes("29BNYPN6916L1ZU")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              legalName: "KHURSHEED ALAM SHAIKH",
              tradeName: "Glass Care Enterprises",
              status: "Active",
              constitutionOfBusiness: "Proprietorship",
              taxpayerType: "Regular",
              address: {
                buildingNo: "No. 122/1",
                buildingName: "Kogilu Layout",
                street: "Kogilu Main Road",
                location: "Bellahalli Cross",
                district: "Bengaluru Urban",
                state: "Karnataka",
                pincode: "560064"
              }
            }
          })
        });
      } else if (url.includes("29AACCB6672L1Z6")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              legalName: "BSE LIMITED",
              tradeName: "BSE Limited",
              status: "Active",
              constitutionOfBusiness: "Public Limited Company",
              address: {
                buildingNo: "No. 184",
                buildingName: "Shree Raghavendra Complex",
                street: "Link Road",
                location: "Malleshwaram",
                district: "Bengaluru",
                state: "Karnataka",
                pincode: "560003"
              }
            }
          })
        });
      } else if (url.includes("01AAACD0474C1ZJ")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              legalName: "Dabur India Limited",
              tradeName: "Dabur India Limited",
              status: "Active",
              constitutionOfBusiness: "Public Limited Company",
              address: {
                buildingNo: "Lane No. 3, Phase-II",
                buildingName: "SIDCO Industrial Complex",
                location: "Bari Brahmana",
                district: "Jammu",
                state: "Jammu and Kashmir",
                pincode: "181133"
              }
            }
          })
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: true, message: "GSTIN not found in the official GST database." })
        });
      }
    });

    // Test bad checksum
    await page.locator("#customerGstin").fill("29BNYPN6916L1ZZ");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(100);
    const badStatus = await page.locator("#gstinStatus").textContent();
    assert.match(badStatus, /checksum verification failed/i);
    console.log("Checksum validation correctly rejected 29BNYPN6916L1ZZ:", badStatus);

    // Test valid Karnataka GSTIN auto-fetch from API
    await page.locator("#customerGstin").fill("29BNYPN6916L1ZU");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    let fetchedName = await page.locator("#customerName").inputValue();
    let fetchedFlat = await page.locator("#flatNo").inputValue();
    let fetchedBuilding = await page.locator("#buildingName").inputValue();
    let fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched from API for 29BNYPN6916L1ZU:", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.strictEqual(fetchedName, "Glass Care Enterprises");
    assert.ok(fetchedFlat.includes("122/1"), "Flat should contain door number");
    assert.ok(fetchedBuilding.includes("Kogilu") || fetchedFlat.includes("Kogilu"), "Should contain Kogilu");
    assert.strictEqual(fetchedState, "Karnataka");
    console.log("GSTIN auto-fetch verified for 29BNYPN6916L1ZU via API!");

    // Test BSE Limited
    await page.locator("#customerGstin").fill("29AACCB6672L1Z6");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    assert.strictEqual(fetchedName, "BSE Limited");
    assert.ok(fetchedFlat.includes("184"), "Flat should contain 184");
    assert.ok(fetchedFlat.includes("Raghavendra Complex") || fetchedBuilding.includes("Raghavendra Complex"), "Should contain complex name");
    console.log("GSTIN auto-fetch verified for 29AACCB6672L1Z6 via API!");

    // Test Dabur India Limited (Jammu and Kashmir 01AAACD0474C1ZJ)
    await page.locator("#customerGstin").fill("01AAACD0474C1ZJ");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 01AAACD0474C1ZJ (Dabur India Limited):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("Dabur India"), "Customer name should contain Dabur India");
    assert.ok(fetchedFlat.includes("SIDCO") || fetchedBuilding.includes("SIDCO"), "Should contain SIDCO Industrial Complex");
    assert.strictEqual(fetchedState, "Jammu and Kashmir");
    console.log("GSTIN auto-fetch verified for Dabur India Limited (01AAACD0474C1ZJ)!");

    // Test sample GSTIN 29AABCA1234F1Z6 (ABC Enterprises Private Limited)
    await page.locator("#customerGstin").fill("29AABCA1234F1Z6");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 29AABCA1234F1Z6 (ABC Enterprises):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("ABC Enterprises"), "Customer name should contain ABC Enterprises");
    assert.ok(fetchedBuilding.includes("Prestige Tech Park") || fetchedFlat.includes("Prestige Tech Park"), "Should contain Prestige Tech Park");
    assert.strictEqual(fetchedState, "Karnataka");
    console.log("GSTIN auto-fetch verified for sample 29AABCA1234F1Z6!");

    // Test Google India Gurugram (06AACCG0527D1Z8)
    await page.locator("#customerGstin").fill("06AACCG0527D1Z8");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 06AACCG0527D1Z8 (Google India Gurugram):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("Google India"), "Customer name should contain Google India");
    assert.ok(fetchedBuilding.includes("Gurugram") || fetchedBuilding.includes("Unitech") || fetchedFlat.includes("Unitech"), "Should contain Unitech or Gurugram");
    assert.strictEqual(fetchedState, "Haryana");
    console.log("GSTIN auto-fetch verified for 06AACCG0527D1Z8 (Haryana)!");

    // Test R N Tuff Glassic (29ADRFS2028L1ZG)
    await page.locator("#customerGstin").fill("29ADRFS2028L1ZG");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 29ADRFS2028L1ZG (R N Tuff Glassic):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("R N Tuff Glassic"), "Customer name should contain R N Tuff Glassic");
    assert.ok(fetchedBuilding.includes("Nagavara") || fetchedFlat.includes("Veeranna"), "Should contain Veeranna or Nagavara");
    assert.strictEqual(fetchedState, "Karnataka");
    console.log("GSTIN auto-fetch verified for 29ADRFS2028L1ZG (R N Tuff Glassic)!");

    // Test Microsoft India (07AAACM5586C1ZJ)
    await page.locator("#customerGstin").fill("07AAACM5586C1ZJ");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 07AAACM5586C1ZJ (Microsoft India):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("Microsoft"), "Customer name should contain Microsoft");
    assert.ok(fetchedBuilding.includes("Connaught Place") || fetchedBuilding.includes("Barakhamba") || fetchedFlat.includes("Cyber"), "Should contain Connaught Place or DLF");
    assert.strictEqual(fetchedState, "Delhi");
    console.log("GSTIN auto-fetch verified for 07AAACM5586C1ZJ (Microsoft India)!");

    // Test Saint-Gobain India (33AAACS1632C1Z3)
    await page.locator("#customerGstin").fill("33AAACS1632C1Z3");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 33AAACS1632C1Z3 (Saint-Gobain Glass):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("Saint-Gobain"), "Customer name should contain Saint-Gobain");
    assert.strictEqual(fetchedState, "Tamil Nadu");
    console.log("GSTIN auto-fetch verified for Saint-Gobain Glass (33AAACS1632C1Z3)!");

    // Test Asahi India Glass (AIS Glass 06AAACA0741M1ZX)
    await page.locator("#customerGstin").fill("06AAACA0741M1ZX");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(300);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 06AAACA0741M1ZX (AIS Glass):", { fetchedName, fetchedState });
    assert.ok(fetchedName.includes("AIS Glass") || fetchedName.includes("Asahi India Glass"), "Customer name should contain AIS Glass");
    assert.strictEqual(fetchedState, "Haryana");
    console.log("GSTIN auto-fetch verified for AIS Glass (06AAACA0741M1ZX)!");

    // Test Live GSTIN Portal Backend Proxy with 08AAACT6908R1ZN (TRIVEDI CORP PRIVATE LIMITED)
    await page.evaluate(() => {
      localStorage.setItem("glassCareGstinBackendUrl", "http://localhost:3000/api/gstin");
      localStorage.setItem("glassCareGstinProvider", "gstinportal");
    });

    await page.locator("#customerGstin").fill("08AAACT6908R1ZN");
    await page.locator("#fetchGstinBtn").click();
    await page.waitForTimeout(1000);

    fetchedName = await page.locator("#customerName").inputValue();
    fetchedFlat = await page.locator("#flatNo").inputValue();
    fetchedBuilding = await page.locator("#buildingName").inputValue();
    fetchedState = await page.locator("#customerState").inputValue();
    console.log("Auto-fetched for 08AAACT6908R1ZN (TRIVEDI CORP PRIVATE LIMITED):", { fetchedName, fetchedFlat, fetchedBuilding, fetchedState });
    assert.ok(fetchedName.includes("TRIVEDI CORP PRIVATE LIMITED"), "Customer name should be TRIVEDI CORP PRIVATE LIMITED");
    assert.ok(fetchedState.includes("Rajasthan"), "Customer state should be Rajasthan");
    assert.ok(fetchedBuilding.includes("307026") || fetchedBuilding.includes("RIICO") || fetchedFlat.includes("SP-229"), "Address should contain PIN 307026 or RIICO");
    console.log("Live GSTIN Portal Backend Proxy verified for 08AAACT6908R1ZN (TRIVEDI CORP PRIVATE LIMITED)!");

    // Test Item Description Box & 12*12*12/1728 Cubic Feet in Inches calculation
    await page.locator("#dimensionUnit").selectOption("in");
    await page.locator("#unitDisplay").selectOption("Cubic Ft");
    await page.locator("#height").fill("12");
    await page.locator("#width").fill("12");
    await page.locator("#thickness").fill("12");
    await page.locator("#quantity").fill("1");

    // Click Edit Rate option in the description card to unlock rate input
    await page.locator("#descEditRateBtn").click();
    await page.waitForTimeout(100);
    const rateIsReadonly = await page.locator("#rate").getAttribute("readonly");
    assert.strictEqual(rateIsReadonly, null, "Clicking Edit Rate button must unlock rate input for editing");
    console.log("Edit Rate button successfully unlocked rate input!");

    await page.locator("#rate").fill("300");
    await page.locator("#rate").dispatchEvent("input");
    await page.locator("#discountPercent").fill("0");
    await page.locator("#discountPercent").dispatchEvent("input");
    await page.locator("#round3InchToggle").setChecked(false);
    await page.waitForTimeout(300);

    // Click auto-generate formula button to verify on-demand formula generation
    await page.locator("#autoGenerateDescBtn").click();
    await page.waitForTimeout(100);

    const descText = await page.locator("#itemDescription").inputValue();
    const descQty = await page.locator("#descQtyDisplay").textContent();
    const descRate = await page.locator("#descRateDisplay").textContent();
    const descTotal = await page.locator("#descTotalAmountDisplay").textContent();

    console.log("Generated Description Box content:", { descText, descQty, descRate, descTotal });
    assert.ok(descText.includes("12") && (descText.includes("1728") || descText.includes("1,728")) && descText.includes("CFT"), "Description must show 12*12*12 / 1728 CFT formula");
    assert.ok(descQty.includes("1"), "Description meta bar must show Qty 1");
    assert.ok(descRate.includes("300"), "Description meta bar must show Rate 300");
    assert.ok(descTotal.includes("300"), "Description meta bar must show Total 300");

    // Test independent leftover aluminum piece quantity & rate (not auto-reflecting glass rate)
    await page.locator("#itemDescription").fill("Leftover aluminum piece 12x12x12");
    await page.locator("#descQtyInput").fill("2");
    await page.locator("#descQtyInput").dispatchEvent("input");
    await page.locator("#descRateInput").fill("150");
    await page.locator("#descRateInput").dispatchEvent("input");
    await page.waitForTimeout(100);

    const customTotal = await page.locator("#descTotalAmountDisplay").textContent();
    assert.ok(customTotal.includes("300"), `Custom description total should be ₹300 for Qty 2 at Rate ₹150, got: ${customTotal}`);
    console.log("Independent custom leftover piece rate & quantity verified:", { customTotal });

    // Reset back to standard inputs for next tests
    await page.locator("#descQtyInput").fill("1");
    await page.locator("#descQtyInput").dispatchEvent("input");
    await page.locator("#descRateInput").fill("300");
    await page.locator("#descRateInput").dispatchEvent("input");

    // Verify Exact Inches Test Case (48 x 48 x 48 in, round-up enabled -> 64.000 CFT -> ₹19,200)
    await page.locator("#height").fill("48");
    await page.locator("#width").fill("48");
    await page.locator("#thickness").fill("48");
    await page.locator("#round3InchToggle").setChecked(true);
    await page.waitForTimeout(200);

    const cftInchesText = await page.locator("#areaDisplay").textContent();
    const amountInchesText = await page.locator("#amountDisplay").textContent();
    const formulaInchesText = await page.locator("#formulaNote").textContent();
    console.log("Browser Exact Inches Test Case:", { cftInchesText, amountInchesText, formulaInchesText });
    assert.ok(cftInchesText.includes("64.000"), "Cubic Ft must be 64.000 for 48x48x48 in");
    assert.ok(amountInchesText.includes("19,200"), "Amount must be ₹19,200 for 64 CFT at ₹300");
    assert.ok(formulaInchesText.includes("1,728") && !formulaInchesText.includes("28,316,846.592"), "Inches formula note must show 1,728 divisor only");

    // Verify Exact Millimetres Test Case (1200 x 1200 x 1200 mm, round-up enabled -> 1219.2 mm -> 64.000 CFT -> ₹19,200)
    await page.locator("#dimensionUnit").selectOption("mm");
    await page.locator("#height").fill("1200");
    await page.locator("#width").fill("1200");
    await page.locator("#thickness").fill("1200");
    await page.locator("#round3InchToggle").setChecked(true);
    await page.waitForTimeout(200);

    const cftMmText = await page.locator("#areaDisplay").textContent();
    const amountMmText = await page.locator("#amountDisplay").textContent();
    const dimsUsedMmText = await page.locator("#roundedSize").textContent();
    const formulaMmText = await page.locator("#formulaNote").textContent();
    console.log("Browser Exact MM Test Case:", { cftMmText, amountMmText, dimsUsedMmText, formulaMmText });
    assert.ok(cftMmText.includes("64.000"), "Cubic Ft must be 64.000 for 1200x1200x1200 mm with 3-inch rounding");
    assert.ok(amountMmText.includes("19,200"), "Amount must be ₹19,200 for 64 CFT at ₹300");
    assert.ok(dimsUsedMmText.includes("1219.2"), "Rounded dimensions must show 1219.2 mm");
    assert.ok(formulaMmText.includes("28,316,846.592") && !formulaMmText.includes("1,728"), "MM formula note must show 28,316,846.592 divisor only");

    // Add this item to the estimate table
    // Select category first
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#confirmSanityCheckbox").setChecked(true);
    await page.locator("#addItem").click();
    await page.waitForTimeout(300);

    const countAfterAdd = await page.locator("#itemCount").textContent();
    assert.ok(countAfterAdd.includes("1 item added"), "Table should show 1 item added");
    console.log("Successfully added item to estimate table:", countAfterAdd);

    // Test Edit button
    const editBtn = page.locator(".row-edit-btn").first();
    await editBtn.click();
    await page.waitForTimeout(200);

    const addItemBtnText = await page.locator("#addItem").textContent();
    assert.ok(addItemBtnText.includes("Update Item #1"), "Add button should become Update Item #1");
    const bannerVisible = await page.locator("#editingBanner").isVisible();
    assert.strictEqual(bannerVisible, true, "Editing banner should be visible");
    console.log("Edit button successfully loaded item into form with banner and update button!");

    // Update the item
    await page.locator("#addItem").click();
    await page.waitForTimeout(300);
    const countAfterUpdate = await page.locator("#itemCount").textContent();
    assert.ok(countAfterUpdate.includes("1 item added"), "Item count should remain 1 after update");
    console.log("Update item completed successfully!");

    // Test Dustbin (Delete) button
    const deleteBtn = page.locator(".action-btn").first();
    await deleteBtn.click();
    await page.waitForTimeout(300);

    const countAfterDelete = await page.locator("#itemCount").textContent();
    assert.ok(countAfterDelete.includes("0 items added"), "Table should show 0 items added after delete");
    console.log("Dustbin (🗑) button successfully deleted item from estimate table!");

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
