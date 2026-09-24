const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'USER'), dashboardController.getDashboardStats);

module.exports = router;
