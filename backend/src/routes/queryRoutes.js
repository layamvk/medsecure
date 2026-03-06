const express = require('express');
const {
    createQuery,
    getQueries,
    getQueryById,
    respondToQuery,
    triageQuery,
    assignQuery,
    updateQueryStatus,
    generateAISuggestion,
    approveAI
} = require('../controllers/queryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createQuery);
router.get('/', getQueries);
router.get('/:id', getQueryById);

router.patch('/:id/triage', authorize('nurse', 'admin'), triageQuery);
router.patch('/:id/assign', authorize('admin', 'receptionist'), assignQuery);
router.post('/:id/respond', authorize('doctor', 'nurse', 'admin'), respondToQuery);
router.patch('/:id/status', authorize('doctor', 'admin'), updateQueryStatus);


// AI approval endpoint
router.post('/:id/approve-ai', authorize('doctor', 'admin'), approveAI);
router.post('/:id/ai-suggestion', authorize('doctor', 'nurse', 'admin'), generateAISuggestion);

module.exports = router;
