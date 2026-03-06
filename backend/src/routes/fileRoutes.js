const express = require('express');
const { uploadAttachment } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post(
    '/queries/:id/attachments',
    protect,
    upload.single('attachment'),
    uploadAttachment
);

module.exports = router;
