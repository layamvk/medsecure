const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    reason: { type: String, default: '' },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled'
    },
    notes: { type: String, default: '' }
}, {
    timestamps: true
});

// Index for fast lookup
appointmentSchema.index({ patientId: 1, date: 1 });
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
