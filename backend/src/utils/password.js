// ============================================================
// WayGo - Utilidades de contrasenas (bcrypt)
// ============================================================
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const hashPassword = (plain) => bcrypt.hash(plain, config.bcryptRounds);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { hashPassword, verifyPassword };
