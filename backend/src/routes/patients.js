const express = require('express');
const {
    getPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
    getMyPatients,
    getPatientStats
} = require('../controllers/patientController');
const { protect, adminOnly, healthcareStaff, authorize } = require('../middleware/auth');
const { validateRequest, patientValidations, commonValidations } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Patient statistics
router.get('/stats', authorize('admin', 'doctor'), getPatientStats);

// Doctor's assigned patients
router.get('/my-patients', authorize('doctor'), patientValidations.query, validateRequest, getMyPatients);

// Patient CRUD routes
router.route('/')
    .get(patientValidations.query, validateRequest, getPatients)
    .post(patientValidations.create, validateRequest, authorize('admin', 'doctor', 'receptionist'), createPatient);

router.route('/:id')
    .get(commonValidations.mongoId, validateRequest, getPatient)
    .put([commonValidations.mongoId, ...patientValidations.update], validateRequest, updatePatient)
    .delete(commonValidations.mongoId, validateRequest, adminOnly, deletePatient);

module.exports = router;