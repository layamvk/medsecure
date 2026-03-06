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
    symptomDescription: { type: String, default: '' },
    urgencyLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    urgencyScore: { type: Number, default: 0 },
    aiSuggestion: {
        recommendedDoctor: { type: String, default: null },
        recommendedDepartment: { type: String, default: null },
        recommendedTime: { type: String, default: null },
        priorityScore: { type: Number, default: 0 },
        reasoning: { type: String, default: '' },
        symptomTags: [{ type: String }]
    },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
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
appointmentSchema.index({ urgencyLevel: 1, status: 1 });
appointmentSchema.index({ 'aiSuggestion.priorityScore': -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
