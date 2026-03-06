const express = require('express');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getProfile,
    updateProfile,
    getUserStats
} = require('../controllers/userController');
const { protect, adminOnly, adminOrDoctor } = require('../middleware/auth');
const { validateRequest, userValidations, commonValidations } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// User statistics (admin only)
router.get('/stats', adminOnly, getUserStats);

// Profile routes (any authenticated user)
router.route('/profile')
    .get(getProfile)
    .put(userValidations.update, validateRequest, updateProfile);

// User CRUD routes
router.route('/')
    .get(userValidations.query, validateRequest, adminOrDoctor, getUsers)
    .post(userValidations.create, validateRequest, adminOnly, createUser);

router.route('/:id')
    .get(commonValidations.mongoId, validateRequest, getUser)
    .put([commonValidations.mongoId, ...userValidations.update], validateRequest, updateUser)
    .delete(commonValidations.mongoId, validateRequest, adminOnly, deleteUser);

module.exports = router;