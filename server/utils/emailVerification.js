const { createHash, randomInt, timingSafeEqual } = require('node:crypto');

function createVerificationCode() {
  return String(randomInt(100000, 1000000));
}

function hashVerificationCode(code) {
  return createHash('sha256').update(String(code)).digest('hex');
}

function verificationCodeMatches(code, storedHash) {
  if (!storedHash) return false;
  const actualHash = Buffer.from(hashVerificationCode(code), 'hex');
  const expectedHash = Buffer.from(storedHash, 'hex');
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
}

module.exports = { createVerificationCode, hashVerificationCode, verificationCodeMatches };