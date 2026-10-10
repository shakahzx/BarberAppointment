const assert = require('node:assert/strict');
const test = require('node:test');
const { createVerificationCode, hashVerificationCode, verificationCodeMatches } = require('../utils/emailVerification');

test('verification codes are six numeric digits', () => {
  assert.match(createVerificationCode(), /^\d{6}$/);
});

test('verification codes are stored as hashes and compared safely', () => {
  const code = '042681';
  const hash = hashVerificationCode(code);
  assert.notEqual(hash, code);
  assert.equal(verificationCodeMatches(code, hash), true);
  assert.equal(verificationCodeMatches('142681', hash), false);
  assert.equal(verificationCodeMatches(code, undefined), false);
});