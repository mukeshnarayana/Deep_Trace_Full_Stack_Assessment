const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../validators/validate');
const { createCampaignSchema, updateCampaignSchema, assignUserSchema } = require('../validators/campaignValidator');

router.use(authenticate);

router.post('/', authorize('ADMIN', 'MANAGER'), validateBody(createCampaignSchema), campaignController.createCampaign);
router.get('/', authorize('ADMIN', 'MANAGER', 'USER'), campaignController.getCampaigns);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'USER'), campaignController.getCampaignById);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validateBody(updateCampaignSchema), campaignController.updateCampaign);
router.delete('/:id', authorize('ADMIN'), campaignController.deleteCampaign);

router.post('/:id/users', authorize('ADMIN', 'MANAGER'), validateBody(assignUserSchema), campaignController.assignUserToCampaign);
router.delete('/:id/users/:userId', authorize('ADMIN', 'MANAGER'), campaignController.removeUserFromCampaign);

module.exports = router;
