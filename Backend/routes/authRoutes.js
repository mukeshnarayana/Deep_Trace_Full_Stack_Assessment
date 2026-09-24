const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const { validateBody } = require('../validators/validate');
const { loginSchema } = require('../validators/authValidator');

router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
