const { Query, AuditLog } = require('../models');
const { analyzeQuery } = require('../services/mlClassifier');
const { generateAIResponse } = require('../services/aiResponseService');
const { generateSuggestion } = require('../services/aiSuggestionService');
const { getIo } = require('../config/socket');

const logEvent = async (userId, action, resourceType, resourceId, metadata = {}) => {
    try {
        await AuditLog.createLog({
            user: userId,
            action,
            resourceType,
            resourceId: resourceId ? resourceId.toString() : null,
            details: metadata
        });
    } catch (err) {
        console.error('Audit fail', err);
    }
};

const createQuery = async (req, res) => {
    try {
        const { patientId, message, attachments } = req.body;
        const finalPatientId = patientId || req.user._id || req.user.id;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        // 1. ML classification
        const ml = analyzeQuery(message);

        // 2. Groq AI response (async, but we want to store suggestion immediately)
        let aiSuggestion = '';
        try {
            aiSuggestion = await generateAIResponse(message, ml);
        } catch (err) {
            aiSuggestion = 'AI response unavailable.';
            console.error('[QUERY] Groq AI error on query creation:', err.message);
        }

        // 3. Smart triage logic
        let status = 'open';
        if (ml.urgency === 'critical') {
            status = 'triaged';
        } else if (ml.urgency === 'high') {
            status = 'triaged';
        }

        // 4. Create query with all fields
        const newQuery = await Query.create({
            patientId: finalPatientId,
            message,
            category: ml.category,
            priority: ml.priority,
            mlCategory: ml.category,
            mlPriority: ml.priority,
            mlConfidence: ml.confidence,
            aiSuggestion,
            status,
            attachments: attachments || []
        });

        // 5. Notify/triage if critical
        if (ml.urgency === 'critical') {
            // TODO: Notify doctor immediately (e.g., via socket, email, etc.)
            // For now, just log
            console.log('Critical query detected. Doctor should be notified.');
        }

        await logEvent(req.user.id, 'create', 'Query', newQuery._id, { role: req.user.role, type: 'QUERY_CREATED', ml });

        // Emit real-time creation event to doctors and nurses dashboards
        try {
            getIo().to('doctor-room').to('nurse-room').to('admin-room').emit('query:new', newQuery);
        } catch (e) { console.error('Socket error (query:new)', e.message); }

        res.status(201).json({ message: 'Query created successfully', query: newQuery });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const getQueries = async (req, res) => {
    try {
        // Patients only see their own queries; staff see all
        const filter = req.user.role === 'patient' ? { patientId: req.user._id } : {};
        const queries = await Query.find(filter)
            .populate('assignedTo', 'name role')
            .populate('responses.responderId', 'name role')
            .populate('patientId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json(queries);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const getQueryById = async (req, res) => {
    try {
        const query = await Query.findById(req.params.id)
            .populate('assignedTo', 'name role')
            .populate('responses.responderId', 'name role')
            .populate('patientId', 'name email');

        if (!query) return res.status(404).json({ error: 'Query not found' });

        await logEvent(req.user.id, 'read', 'Query', query._id, { role: req.user.role, type: 'QUERY_VIEWED' });

        res.status(200).json(query);
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ error: 'Query not found' });
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const triageQuery = async (req, res) => {
    try {
        const { category, priority } = req.body;

        const oldQuery = await Query.findById(req.params.id);
        if (!oldQuery) return res.status(404).json({ error: 'Query not found' });

        const query = await Query.findByIdAndUpdate(
            req.params.id,
            { status: 'triaged', ...(category && { category }), ...(priority && { priority }) },
            { new: true, runValidators: true }
        );

        await logEvent(req.user.id, 'update', 'Query', query._id, {
            role: req.user.role, previousStatus: oldQuery.status, newStatus: 'triaged', type: 'QUERY_TRIAGED'
        });

        // Emit real-time status update
        try {
            getIo().emit('query:status', query);
        } catch (e) { console.error('Socket error (query:status)', e.message); }

        res.status(200).json({ message: 'Query triaged successfully', query });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const assignQuery = async (req, res) => {
    try {
        const { doctorId } = req.body;
        if (!doctorId) return res.status(400).json({ error: 'Doctor ID is required for assignment' });

        const oldQuery = await Query.findById(req.params.id);
        if (!oldQuery) return res.status(404).json({ error: 'Query not found' });

        const query = await Query.findByIdAndUpdate(
            req.params.id,
            { assignedTo: doctorId, status: 'in_progress' },
            { new: true, runValidators: true }
        );

        await logEvent(req.user.id, 'update', 'Query', query._id, {
            role: req.user.role, assignedUser: doctorId, previousStatus: oldQuery.status, newStatus: 'in_progress', type: 'QUERY_ASSIGNED'
        });

        // Emit assignment real-time
        try {
            getIo().to(`user-${doctorId}`).emit('query:assigned', query);
            getIo().emit('query:status', query);
        } catch (e) { console.error('Socket error (query:assigned)', e.message); }

        res.status(200).json({ message: 'Query assigned successfully', query });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const respondToQuery = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Response message is required' });

        const query = await Query.findById(req.params.id);
        if (!query) return res.status(404).json({ error: 'Query not found' });

        // Enforce AI approval: if aiSuggestion exists and aiApproved is false, block sending
        if (query.aiSuggestion && !query.aiApproved && message.trim() === query.aiSuggestion.trim()) {
            await logEvent(req.user.id, 'blocked', 'Query', query._id, { role: req.user.role, type: 'AI_RESPONSE_BLOCKED' });
            return res.status(400).json({ error: 'AI suggestions must be reviewed and approved by a doctor.' });
        }

        // Add response
        const newResponse = { responderId: req.user._id || req.user.id, message };
        query.responses.push(newResponse);
        query.status = 'responded';
        await query.save();

        await logEvent(req.user.id, 'AI_RESPONSE_SENT', 'Query', query._id, { role: req.user.role, type: 'AI_RESPONSE_SENT' });

        // Emit live response back to patient and general rooms
        try {
            getIo().emit('query:response', query);
        } catch (e) { console.error('Socket error (query:response)', e.message); }

        res.status(200).json({ message: 'Response added successfully', query });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// POST /api/queries/:id/approve-ai
const approveAI = async (req, res) => {
    try {
        const query = await Query.findById(req.params.id);
        if (!query) return res.status(404).json({ error: 'Query not found' });
        if (!query.aiSuggestion) return res.status(400).json({ error: 'No AI suggestion to approve.' });
        if (query.aiApproved) return res.status(400).json({ error: 'AI suggestion already approved.' });

        query.aiApproved = true;
        query.approvedBy = req.user._id || req.user.id;
        query.approvedAt = new Date();
        await query.save();

        await logEvent(req.user.id, 'AI_APPROVED', 'Query', query._id, { role: req.user.role, type: 'AI_APPROVED' });

        res.status(200).json({ message: 'AI suggestion approved.', query });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const updateQueryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });

        const oldQuery = await Query.findById(req.params.id);
        if (!oldQuery) return res.status(404).json({ error: 'Query not found' });

        const query = await Query.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        if (!query) return res.status(404).json({ error: 'Query not found' });

        await logEvent(req.user.id, 'update', 'Query', query._id, {
            role: req.user.role, previousStatus: oldQuery.status, newStatus: status, type: 'QUERY_STATUS_UPDATED'
        });

        // Emit generic status change
        try {
            getIo().emit('query:status', query);
        } catch (e) { console.error('Socket error (query:status)', e.message); }

        res.status(200).json({ message: 'Query status updated successfully', query });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const generateAISuggestion = async (req, res) => {
    try {
        const query = await Query.findById(req.params.id);
        if (!query) return res.status(404).json({ error: 'Query not found' });

        // Run ML classifier first
        const ml = analyzeQuery(query.message);
        
        // Try Groq AI, fall back to keyword-based
        let suggestionDraft;
        try {
            suggestionDraft = await generateAIResponse(query.message, ml);
        } catch (err) {
            console.error('[QUERY] Groq AI fallback:', err.message);
            suggestionDraft = generateSuggestion(query.message);
        }

        query.aiSuggestion = suggestionDraft;
        query.mlCategory = ml.category;
        query.mlPriority = ml.priority;
        query.mlConfidence = ml.confidence;
        query.aiGeneratedAt = new Date();
        await query.save();

        await logEvent(req.user.id, 'update', 'Query', query._id, { role: req.user.role, type: 'AI_SUGGESTION_GENERATED', ml });

        res.status(200).json({ 
            message: 'AI draft generated successfully', 
            aiSuggestion: query.aiSuggestion,
            classification: {
                category: ml.category,
                priority: ml.priority,
                urgency: ml.urgency,
                confidence: ml.confidence,
                emergencyDetected: ml.emergencyDetected
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    createQuery,
    getQueries,
    getQueryById,
    triageQuery,
    assignQuery,
    respondToQuery,
    updateQueryStatus,
    generateAISuggestion,
    approveAI
};
