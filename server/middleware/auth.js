const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');

const authenticate = asyncHandler(async (request, response, next) => {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : null;
  if (!token) return response.status(401).json({ message: 'Please log in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return response.status(401).json({ message: 'This account is unavailable.' });
    request.user = user;
    next();
  } catch {
    return response.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
});

function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };