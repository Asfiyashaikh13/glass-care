const test = require("node:test");
const assert = require("node:assert/strict");
const { validateGstin, calculateGSTChecksum, GST_STATE_CODE_MAP } = require("../data.js");

// Test normalized response parser
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

test("Valid active Karnataka GSTIN checksum and state mapping", () => {
  const gstin = "29BNYPN6916L1ZU";
  const res = validateGstin(gstin);
  assert.equal(res.valid, true);
  assert.equal(res.stateCode, "29");
  assert.equal(res.stateName, "Karnataka");
  assert.equal(res.pan, "BNYPN6916L");
  assert.equal(res.entityCode, "1");
});

test("Valid Dabur India Limited (Jammu and Kashmir 01AAACD0474C1ZJ)", () => {
  const res = validateGstin("01AAACD0474C1ZJ");
  assert.equal(res.valid, true);
  assert.equal(res.stateCode, "01");
  assert.equal(res.stateName, "Jammu and Kashmir");
  assert.equal(res.pan, "AAACD0474C");
});

test("Valid GSTIN from another state (Maharashtra, Gujarat, Delhi)", () => {
  const maha = validateGstin("27AAPFU0939F1ZV");
  assert.equal(maha.valid, true);
  assert.equal(maha.stateCode, "27");
  assert.equal(maha.stateName, "Maharashtra");

  const guj = validateGstin("24ABKCS2033B1ZV");
  assert.equal(guj.valid, true);
  assert.equal(guj.stateCode, "24");
  assert.equal(guj.stateName, "Gujarat");

  const delhi = validateGstin("07AABCG5228D1ZZ");
  assert.equal(delhi.valid, true);
  assert.equal(delhi.stateCode, "07");
  assert.equal(delhi.stateName, "Delhi");
});

test("Invalid GSTIN checksum detection", () => {
  const badCheck = validateGstin("29BNYPN6916L1ZZ");
  assert.equal(badCheck.valid, false);
  assert.match(badCheck.error, /checksum verification failed/i);
  assert.equal(badCheck.expectedCheck, "U");
  assert.equal(badCheck.actualCheck, "Z");
});

test("Empty, short, and malformed GSTIN rejection", () => {
  assert.equal(validateGstin("").valid, false);
  assert.equal(validateGstin(null).valid, false);
  assert.equal(validateGstin(undefined).valid, false);
  assert.equal(validateGstin("29AACI1681G1ZL").valid, false); // 14 chars
  assert.equal(validateGstin("29AACI1681G1ZLX").valid, false); // bad chars
});

test("Non-existent GSTIN / provider 404 response handling", () => {
  const notFoundResp = {
    error: true,
    message: "Invalid GST Number or GSTIN does not exist."
  };
  const normalized = normalizeGstinResponse(notFoundResp);
  assert.equal(normalized, null);
});

test("Cancelled registration status mapping", () => {
  const cancelledPayload = {
    flag: true,
    data: {
      legalName: "OBSOLETE COMMERCIALS PRIVATE LIMITED",
      tradeName: "OBSOLETE TECH",
      status: "Cancelled",
      cancellationDate: "31/03/2023",
      constitutionOfBusiness: "Private Limited Company",
      taxpayerType: "Regular",
      address: {
        buildingNo: "Flat 4A",
        buildingName: "Old Commerce Hub",
        street: "MG Road",
        district: "Bengaluru",
        pincode: "560001",
        state: "Karnataka"
      }
    }
  };
  const res = normalizeGstinResponse(cancelledPayload);
  assert.ok(res);
  assert.equal(res.legalName, "OBSOLETE COMMERCIALS PRIVATE LIMITED");
  assert.equal(res.tradeName, "OBSOLETE TECH");
  assert.equal(res.status, "Cancelled");
  assert.equal(res.cancellationDate, "31/03/2023");
  assert.equal(res.state, "Karnataka");
  assert.equal(res.pincode, "560001");
});

test("Suspended registration status mapping", () => {
  const suspendedPayload = {
    error: false,
    taxpayerInfo: {
      legalName: "AUDIT PENDING ENTERPRISES",
      tradeName: "AUDIT PENDING",
      status: "Suspended",
      constitutionOfBusiness: "Partnership Firm",
      taxpayerType: "Regular",
      getAddress: {
        bno: "Shop 12",
        bnm: "City Market",
        st: "Avenue Road",
        loc: "Chickpet",
        dst: "Bengaluru",
        state: "Karnataka",
        pncd: "560053"
      }
    }
  };
  const res = normalizeGstinResponse(suspendedPayload);
  assert.ok(res);
  assert.equal(res.legalName, "AUDIT PENDING ENTERPRISES");
  assert.equal(res.status, "Suspended");
  assert.equal(res.constitution, "Partnership Firm");
  assert.ok(res.flatNo.includes("Shop 12"));
  assert.ok(res.buildingName.includes("City Market"));
});

test("Address mapping preserves distinct legal name and trade name without confusion", () => {
  const payload = {
    taxpayerInfo: {
      legalName: "KHURSHEED ALAM SHAIKH",
      tradeName: "GLASS CARE ENTERPRISES",
      status: "Active",
      constitutionOfBusiness: "Proprietorship",
      taxpayerType: "Regular",
      registrationDate: "02/03/2023",
      getAddress: {
        bno: "No. 122/1",
        flno: "Ground Floor",
        bnm: "Kogilu Layout",
        st: "Kogilu Main Road",
        loc: "Bellahalli Cross",
        dst: "Bengaluru Urban",
        state: "Karnataka",
        pncd: "560064"
      }
    }
  };
  const res = normalizeGstinResponse(payload);
  assert.ok(res);
  assert.equal(res.legalName, "KHURSHEED ALAM SHAIKH");
  assert.equal(res.tradeName, "GLASS CARE ENTERPRISES");
  assert.notEqual(res.legalName, res.tradeName);
  assert.equal(res.status, "Active");
  assert.equal(res.constitution, "Proprietorship");
  assert.equal(res.flatNo, "No. 122/1, Ground Floor, Bellahalli Cross");
  assert.equal(res.buildingName, "Kogilu Layout, Kogilu Main Road, Bengaluru Urban, PIN: 560064");
  assert.equal(res.pincode, "560064");
  assert.equal(res.state, "Karnataka");
});

test("GSTIN Portal live API response mapping for TRIVEDI CORP PRIVATE LIMITED (08AAACT6908R1ZN)", async () => {
  const gstinapiPayload = {
    success: true,
    gstin: "08AAACT6908R1ZN",
    data: {
      gstin: "08AAACT6908R1ZN",
      legal_name: "TRIVEDI CORP PRIVATE LIMITED",
      trade_name: "TRIVEDI CORP PRIVATE LIMITED",
      status: "Active",
      taxpayer_type: "Regular",
      business_constitution: null,
      registration_date: "2017-07-01",
      cancellation_date: null,
      state_code: "08",
      state_jurisdiction: null,
      address: "PLOT NO.SP-229, 230, 231, RIICO GROWTH CENTER, PHASE-II, MAVAL, ABU ROAD",
      city: "ABU ROAD",
      address_details: {
        building_number: "PLOT NO.SP-229, 230, 231",
        building_name: "RIICO GROWTH CENTER, PHASE-II",
        floor: null,
        street: "MAVAL",
        locality: "ABU ROAD",
        district: null,
        city: null,
        state: "Rajasthan",
        landmark: null,
        pincode: "307026"
      },
      pincode: "307026"
    }
  };

  const payload = gstinapiPayload.data;
  assert.equal(payload.legal_name, "TRIVEDI CORP PRIVATE LIMITED");
  assert.equal(payload.status, "Active");
  assert.equal(payload.address_details.state, "Rajasthan");
  assert.equal(payload.pincode, "307026");
});
