const glassCategories = [
  "Antique decorative etching design, color, acid texture & clusters 10mm flat tough glass.",
  "Aquarium 10mm toughened flat glass work.",
  "Aquarium 8+8mm toughened laminated flat glass work.",
  "Balcony etching color, acid texture 10mm flat toughened design glass.",
  "Balcony plain 10mm flat toughened design glass with holes.",
  "Balcony plain 10mm flat toughened etching design glass.",
  "Balcony wall railing Stainless steel studs hardware of no\u2019s",
  "Bar unit glass floor 12+12mm toughened laminated flat glass work.",
  "Beveled polished design 6mm flat glass.",
  "Beveled polished plain 6mm flat glass.",
  "Border design 6mm flat glass.",
  "Border design color 6mm flat glass.",
  "Box design color 6mm flat glass.",
  "C half polished 10mm flat glass.",
  "C polished plain 10mm flat glass.",
  "Calming glass pattern decorative design 10mm flat tough glass.",
  "Canopy 10mm flat toughened design glass with installation, hardware.",
  "Canopy 10mm flat toughened plain glass with installation, hardware.",
  "Ceiling design color & acid texture 6mm flat glass.",
  "Center etching color design 6mm flat glass.",
  "Center etching color lord design 6mm flat glass.",
  "Center etching design 6mm flat glass.",
  "Center etching lord design 6mm flat glass.",
  "Center etching lord design color & acid texture 6mm flat glass.",
  "Center multiplayer deep etching design color, acid texture 8mm flat glass.",
  "Corner etching color design 6mm flat glass.",
  "Corner etching design 6mm flat glass.",
  "Digital HD print design 8mm flat glass.",
  "Door Plain polished 10mm flat tough glass with installation, hardware.",
  "Door Plain polished tough 10mm flat glass.",
  "Door side fixed partition 10mm flat toughened design glass.",
  "Door side fixed partition 10mm flat toughened plain glass with installation, hardware.",
  "False ceiling design color & acid texture 6mm flat glass.",
  "Flooring aria 10+10mm toughened laminated glass work.",
  "Glass cabinets Plain polished tough 10mm flat glass.",
  "Glass cabinets V groove, etching color, acid texture polished tough 10mm flat glass.",
  "Glass mural design antique decorative etching design, color, acid texture & clusters 8mm flat tough glass.",
  "Glazing one way vision 4mm flat glass.",
  "Hall aria decorative design 6mm bronze flat tough glass.",
  "Hall aria decorative design 6mm design flat tough glass.",
  "Hall aria plain 6mm flat tough glass.",
  "Kitchen shutters V groove, etching color, acid texture 6mm toughened flat design glass.",
  "Kitchen unit shutters beveled polished design 6mm flat glass.",
  "Kitchen unit shutters beveled polished design 6mm tough flat glass.",
  "Kitchen unit shutters lacquered decorative design 6mm flat tough glass.",
  "Lacquered decorative design 6mm flat tough glass.",
  "Lacquered plain 6mm flat glass.",
  "Lord figure etching color acid texture design 6mm flat glass.",
  "Lord figure etching color design 6mm flat glass.",
  "Lord figure etching design 6mm flat glass.",
  "Lord figure multilayer deep etching lord design color, acid texture 8mm flat glass.",
  "Main Door Plain polished tough 10mm flat glass with installation, hardware.",
  "Main door 10mm tough polished antique glass etching design, color, acid",
  "Mirror beveled polished 6mm flat glass.",
  "Mirror beveled polished design 6mm flat glass.",
  "Mirror beveled sensor lighting 6mm flat bathroom & living aria glass.",
  "Mirror border etching design, color 6mm flat glass.",
  "Mirror design colors 6mm flat glass.",
  "Mirror polished 6mm flat glass.",
  "Mirror polished antique glass etching design, color, acid texture & clusters.",
  "Mirror sensor lighting 6mm flat bathroom & living aria glass.",
  "Name plates etching color, acid texture 10mm toughened flat design glass.",
  "Name plates stained 4mm & 6mm toughened sandwich glass work with holes.",
  "Polished 6mm plain flat glass.",
  "Pooja Door 10mm flat polished tough design glass etching color, acid texture.",
  "Pooja Door Plain polished tough 10mm flat glass.",
  "Pooja fixed partition polished 10mm flat glass.",
  "Pooja partition hollow design etching color, acid texture polished 6mm flat glass.",
  "Round ceiling design etching 6mm flat tough glass.",
  "Round ceiling design etching color & acid texture 6mm flat tough glass.",
  "Saint gobain original lacquered 6mm flat glass.",
  "Saint gobain original lacquered decorative design 6mm flat glass.",
  "Shower cubicle polished 10mm flat tough glass & installation only.",
  "Shower cubicle polished 10mm flat tough glass with installation @ hardware.",
  "Sky light 10mm plain toughened flat glass.",
  "Sky light 10mm toughened flat design glass etching color, acid texture.",
  "Spider fittings polished 12mm flat tough glasses with installation, hardware.",
  "Stained 4mm & 6mm toughened sandwich glass work.",
  "Staircase railing 10mm flat toughened plain glass.",
  "Staircase railing 10mm toughened flat design glass etching color, acid texture.",
  "Staircase steps Stainless steel studs hardware of no\u2019s",
  "Staircase wall aria decorative design 6mm bronze flat tough glass.",
  "Staircase wall aria decorative design 6mm flat tough glass",
  "Steps chipped shine 12mm flat plain glass.",
  "Steps zigzag shine 12mm flat plain glass.",
  "Stripes line etching 6mm flat glass.",
  "Table top polished 10mm flat plain glass.",
  "Table top taper & polished 10mm flat plain glass.",
  "Taper polished 6mm flat plain glass.",
  "Tv unit decorative design 10mm flat tough glass.",
  "Ultra white 10mm toughened flat design glass etching color, acid texture.",
  "Ultra white lacquered 6mm flat glass.",
  "Ultra white lacquered decorative design 6mm flat tough glass.",
  "Ultra white polished 6mm flat design glass etching color, acid texture.",
  "Ultra white polished plain 10mm flat glass.",
  "Ultra white polished plain 6mm flat glass.",
  "Ultra white taper polished 10mm flat plain glass.",
  "V groove, etching color, acid texture 10mm toughened flat design glass.",
  "Vector glass pattern decorative design 10mm flat tough glass.",
  "Wall aria decorative design 6mm bronze flat tough glass.",
  "Wall aria decorative design 6mm flat tough glass.",
  "Wall unit lacquered decorative design 6mm flat tough glass.",
  "Wardrobe 10mm toughened flat design glass etching color, acid texture.",
  "Wardrobe lacquered decorative design 6mm flat tough glass.",
  "texture & clusters with installation, hardware."
];

const itemNames = [
  "25X45mm Slim work aluminiam",
  "Al Shutter's",
  "Al Style Door",
  "All",
  "Aluminiam window",
  "Entrence Partition, 25X45 Al Fixed,",
  "L Office Partition 25X45 Al Fixed,",
  "SGG Plain Bend Glass",
  "Shutter's",
  "Wall Partition, 25X45 Al Fixed,"
];

const states = [
  "Karnataka",
  "Tamil Nadu",
  "Kerala",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Goa",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Bihar",
  "Odisha",
  "Assam"
];

const GST_STATE_CODE_MAP = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

/**
 * Calculates the official 15th checksum character using the Luhn Mod-36 algorithm.
 * @param {string} gstin14 - First 14 characters of the GSTIN.
 * @returns {string|null} - 15th checksum character (0-9, A-Z) or null if invalid.
 */
function calculateGSTChecksum(gstin14) {
  if (!gstin14 || typeof gstin14 !== "string" || gstin14.length < 14) return null;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let total = 0;
  const modulus = 36;
  const s = gstin14.toUpperCase().slice(0, 14);

  for (let i = 0; i < 14; i++) {
    const char = s[i];
    const weight = chars.indexOf(char);
    if (weight === -1) return null;
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = weight * factor;
    const quotient = Math.floor(product / modulus);
    const remainder = product % modulus;
    total += (quotient + remainder);
  }

  let checkDigitIndex = (modulus - (total % modulus)) % modulus;
  return chars[checkDigitIndex];
}

/**
 * Strictly validates an Indian GSTIN: length, structure, state code, and Mod-36 checksum.
 * @param {string} raw - The GSTIN string to validate.
 * @returns {object} - { valid: boolean, clean?: string, stateCode?: string, stateName?: string, error?: string }
 */
function validateGstin(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "GSTIN is empty." };
  }
  const clean = raw.trim().toUpperCase();
  if (clean.length !== 15) {
    return {
      valid: false,
      error: `GSTIN must be exactly 15 characters (entered ${clean.length}).`,
      length: clean.length,
      clean
    };
  }

  // 1. Structure check: 2 digits + 5 letters PAN + 4 digits PAN + 1 letter PAN + 1 entity code + 'Z' + 1 checksum
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return {
      valid: false,
      error: "GSTIN format is invalid (expected 2 digits + 10-char PAN + 1 entity code + 'Z' + 1 checksum character).",
      clean
    };
  }

  // 2. State Code validation
  const stateCode = clean.slice(0, 2);
  const stateName = GST_STATE_CODE_MAP[stateCode] || null;
  if (!stateName) {
    return {
      valid: false,
      error: `Invalid GST state code '${stateCode}'.`,
      stateCode,
      clean
    };
  }

  // 3. Official Mod-36 Checksum verification
  const expectedCheck = calculateGSTChecksum(clean.slice(0, 14));
  const actualCheck = clean[14];
  if (expectedCheck !== actualCheck) {
    return {
      valid: false,
      error: `GSTIN checksum verification failed (expected '${expectedCheck}', got '${actualCheck}').`,
      expectedCheck,
      actualCheck,
      stateCode,
      stateName,
      clean
    };
  }

  return {
    valid: true,
    clean,
    stateCode,
    stateName,
    pan: clean.slice(2, 12),
    entityCode: clean[12]
  };
}

if (typeof window !== "undefined") {
  window.GST_STATE_CODE_MAP = GST_STATE_CODE_MAP;
  window.states = states;
  window.calculateGSTChecksum = calculateGSTChecksum;
  window.validateGstin = validateGstin;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    glassCategories,
    itemNames,
    states,
    GST_STATE_CODE_MAP,
    calculateGSTChecksum,
    validateGstin
  };
}

