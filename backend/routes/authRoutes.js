const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middlewares/authenticateToken');

router.post('/login', authController.login);
router.put('/me/profile', authenticateToken, authController.updateProfile);
router.put('/me/password', authenticateToken, authController.updatePassword);

module.exports = router;
