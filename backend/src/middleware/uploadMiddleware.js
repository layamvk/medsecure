const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

module.exports = { upload };
