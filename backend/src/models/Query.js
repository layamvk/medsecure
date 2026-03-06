const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    responderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const attachmentSchema = new mongoose.Schema({
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

const querySchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: { type: String, required: true },
    category: { type: String },
    priority: {
        type: String,
        enum: ['normal', 'urgent', 'critical'],
        default: 'normal'
    },
    mlCategory: { type: String },
    mlPriority: { type: String },
    mlConfidence: { type: Number },
    aiSuggestion: { type: String, default: null },
    status: {
        type: String,
        enum: ['open', 'triaged', 'in_progress', 'responded', 'closed'],
        default: 'open'
    },
    aiApproved: { type: Boolean, default: false },
    aiGeneratedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [attachmentSchema],
    responses: [responseSchema],
    // aiSuggestion now above for clarity
}, {
    timestamps: true
});

module.exports = mongoose.model('Query', querySchema);
