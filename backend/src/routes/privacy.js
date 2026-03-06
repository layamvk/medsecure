const express = require('express');
const {
    getPrivacyBudgets,
    getPrivacyBudget,
    createPrivacyBudget,
    updatePrivacyBudget,
    resetPrivacyBudget,
    consumePrivacyBudget,
    getUserBudgetSummary,
    getBudgetsNeedingReset,
    autoResetBudgets
} = require('../controllers/privacyController');
const { protect, adminOnly, adminOrDoctor } = require('../middleware/auth');
const { validateRequest, privacyValidations, commonValidations } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// User's budget summary
router.get('/summary', getUserBudgetSummary);

// Budgets needing reset (admin only)
router.get('/reset-needed', adminOnly, getBudgetsNeedingReset);

// Auto-reset budgets (admin only)
router.post('/auto-reset', adminOnly, autoResetBudgets);

// Budget consumption
router.post('/:id/consume', [
    commonValidations.mongoId,
    ...privacyValidations.consume
], validateRequest, consumePrivacyBudget);

// Budget reset
router.post('/:id/reset', commonValidations.mongoId, validateRequest, adminOrDoctor, resetPrivacyBudget);

// Privacy budget CRUD routes
router.route('/')
    .get(privacyValidations.query, validateRequest, getPrivacyBudgets)
    .post(privacyValidations.create, validateRequest, adminOrDoctor, createPrivacyBudget);

router.route('/:id')
    .get(commonValidations.mongoId, validateRequest, getPrivacyBudget)
    .put([commonValidations.mongoId, ...privacyValidations.update], validateRequest, adminOnly, updatePrivacyBudget);

module.exports = router;