const crypto = require('crypto');

// Mock cloud storage upload
const uploadFile = async (file) => {
    try {
        const randomHash = crypto.randomBytes(8).toString('hex');
        const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const cloudUrl = `https://mock-cloud-storage.net/medsecure/${randomHash}-${sanitizedFileName}`;

        return {
            fileUrl: cloudUrl,
            fileType: file.mimetype
        };
    } catch (error) {
        throw new Error(`Cloud storage upload failed: ${error.message}`);
    }
};

module.exports = { uploadFile };
