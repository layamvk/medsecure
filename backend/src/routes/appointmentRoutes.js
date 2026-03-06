const express = require('express');
const {
    getAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    getDoctors
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(protect);

// Doctors list (for booking form)
router.get('/doctors', getDoctors);

// CRUD
router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;
