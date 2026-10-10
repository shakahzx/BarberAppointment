const { createHash, randomBytes } = require('node:crypto');

function createManageToken() {
  return randomBytes(32).toString('base64url');
}

function hashManageToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

module.exports = { createManageToken, hashManageToken };