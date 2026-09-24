const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../validators/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userValidator');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), userController.getUsers);
router.post('/', authorize('ADMIN'), validateBody(createUserSchema), userController.createUser);
router.patch('/:id', authorize('ADMIN'), validateBody(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

module.exports = router;
