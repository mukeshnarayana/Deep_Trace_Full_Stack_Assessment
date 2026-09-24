const express = require('express');
const router = express.Router();
const securityEventController = require('../controllers/securityEventController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../validators/validate');
const { createSecurityEventSchema, updateSecurityEventSchema } = require('../validators/securityEventValidator');

router.use(authenticate);

router.post('/', authorize('ADMIN', 'MANAGER'), validateBody(createSecurityEventSchema), securityEventController.createSecurityEvent);
router.get('/', authorize('ADMIN', 'MANAGER', 'USER'), securityEventController.getSecurityEvents);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'USER'), securityEventController.getSecurityEventById);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validateBody(updateSecurityEventSchema), securityEventController.updateSecurityEvent);

module.exports = router;
