const jwt = require('jsonwebtoken');
const loanService = require('./loanService');

const JWT_SECRET = process.env.JWT_SECRET || 'loan-desk-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

async function login(username, password) {
  const authResult = await loanService.loginUser(username, password);
  const token = jwt.sign(authResult.tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    roleType: authResult.roleType,
    user: authResult.user,
    profile: authResult.profile,
    employee: authResult.employee,
  };
}

async function updateProfile(auth, payload) {
  return loanService.updateCurrentUserProfile(auth, payload);
}

async function updatePassword(auth, payload) {
  return loanService.updateCurrentUserPassword(auth, payload);
}

module.exports = { login, updateProfile, updatePassword };
