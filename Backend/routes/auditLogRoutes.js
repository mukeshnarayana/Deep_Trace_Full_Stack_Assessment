const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', authorize('ADMIN'), auditLogController.getAuditLogs);

module.exports = router;
