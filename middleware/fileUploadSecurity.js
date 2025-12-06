const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

/**
 * File upload security middleware
 * Validates file types, sizes, and generates secure filenames
 */

// Allowed MIME types for uploads
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
];

const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file type is allowed
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and audio (MP3, WAV, OGG)`
      ),
      false
    );
  }
};

// Generate secure random filename
const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString("hex");
  const extension = path.extname(originalname);
  return `upload-${timestamp}-${randomString}${extension}`;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "labelImageFile") {
      cb(null, path.join(__dirname, "../public/style/images"));
    } else {
      cb(null, path.join(__dirname, "../uploads"));
    }
  },
  filename: (req, file, cb) => {
    const secureFilename = generateSecureFilename(file.originalname);
    console.log(`Secure upload: ${secureFilename}`);
    cb(null, secureFilename);
  },
});

// Create multer instance with security options
const secureUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 2, // Max 2 files per request
  },
  fileFilter: fileFilter,
});

// Error handling middleware for file uploads
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send("File size too large (max 10MB)");
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).send("Too many files");
    }
    return res.status(400).send(`Upload error: ${err.message}`);
  } else if (err) {
    return res.status(400).send(err.message);
  }
  next();
};

module.exports = {
  secureUpload,
  handleUploadErrors,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
};
