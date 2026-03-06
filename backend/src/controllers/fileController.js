const { Query, AuditLog } = require('../models');
const { uploadFile } = require('../services/storageService');

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

const uploadAttachment = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided or invalid file type' });
        }

        const query = await Query.findById(req.params.id);
        if (!query) return res.status(404).json({ error: 'Query not found' });

        const uploadedData = await uploadFile(file);

        const newAttachment = {
            fileUrl: uploadedData.fileUrl,
            fileType: uploadedData.fileType,
            uploadedAt: new Date()
        };

        query.attachments.push(newAttachment);
        await query.save();

        await logEvent(req.user.id, 'update', 'Query', query._id, {
            role: req.user.role,
            fileType: uploadedData.fileType,
            type: 'QUERY_ATTACHMENT_UPLOADED'
        });

        res.status(200).json(newAttachment);
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ error: 'Query not found' });
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = { uploadAttachment };
