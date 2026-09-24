const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const campaignRoutes = require('./campaignRoutes');
const securityEventRoutes = require('./securityEventRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const dashboardRoutes = require('./dashboardRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/security-events', securityEventRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
