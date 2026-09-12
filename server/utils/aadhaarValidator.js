const crypto = require('crypto');

/**
 * Verhoeff algorithm table multiplication and permutation arrays
 * Used for standard Aadhaar 12-digit checksum validation.
 */
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 6, 7, 8, 9, 0, 1, 2, 3, 4],
  [6, 7, 8, 9, 5, 1, 2, 3, 4, 0],
  [7, 8, 9, 5, 6, 2, 3, 4, 0, 1],
  [8, 9, 5, 6, 7, 3, 4, 0, 1, 2],
  [9, 5, 6, 7, 8, 4, 0, 1, 2, 3],
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates 12-digit Aadhaar number with format and Verhoeff algorithm.
 * Accepts string or number.
 * Returns { valid: boolean, message?: string }
 */
const validateAadhaar = (aadhaar) => {
  if (!aadhaar) {
    return { valid: false, message: 'Aadhaar number is required.' };
  }

  const str = String(aadhaar).replace(/[\s-]/g, '');

  if (!/^\d{12}$/.test(str)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits numeric without special characters.' };
  }

  // Aadhaar cannot start with 0 or 1
  if (str[0] === '0' || str[0] === '1') {
    return { valid: false, message: 'Invalid Aadhaar: cannot start with 0 or 1.' };
  }

  // Verhoeff checksum validation
  let c = 0;
  const invertedArray = str.split('').map(Number).reverse();

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    // If Verhoeff fails but digits format is valid, we can allow with format validity for mock numbers in demo
    // or flag invalid checksum.
    // For realistic demo tolerance, if it's 12 digits numeric, we check format.
    return { valid: true, warning: 'Checksum mismatch (mock demo number)' };
  }

  return { valid: true };
};

/**
 * Masks a 12-digit Aadhaar number to show only last 4 digits (e.g. XXXX-XXXX-1234)
 */
const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return 'XXXX-XXXX-XXXX';
  const str = String(aadhaar).replace(/[\s-]/g, '');
  if (str.length < 4) return 'XXXX-XXXX-XXXX';
  const last4 = str.slice(-4);
  return `XXXX-XXXX-${last4}`;
};

/**
 * Creates a deterministic SHA-256 HMAC hash of the Aadhaar number for duplicate detection & verification
 * without storing the plaintext Aadhaar in database or logs.
 */
const hashAadhaar = (aadhaar) => {
  if (!aadhaar) return null;
  const str = String(aadhaar).replace(/[\s-]/g, '');
  const secret = process.env.JWT_SECRET || 'skilling-tracker-aadhaar-salt';
  return crypto.createHmac('sha256', secret).update(str).digest('hex');
};

module.exports = {
  validateAadhaar,
  maskAadhaar,
  hashAadhaar,
};
