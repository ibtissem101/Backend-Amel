const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { supabase, supabaseAdmin } = require("../config/supabase");

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Generate unique filename using timestamp + original name
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedExtensions = [".jpeg", ".jpg", ".png", ".webp"];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) &&
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, WEBP) are allowed"), false);
  }
};

// Configure Multer with size limit and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Function to upload file to Supabase Storage
const uploadToSupabase = async (file, bucketName = "photos") => {
  try {
    if (!file || !file.path) {
      throw new Error("No file provided or invalid file object");
    }

    // Read the file from local storage
    const fileBuffer = await fs.readFile(file.path);

    // Generate a unique filename for Supabase storage
    const fileName = `${Date.now()}-${file.originalname}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!publicUrlData.publicUrl) {
      throw new Error("Failed to get public URL from Supabase");
    }

    // Delete the temporary local file
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.warn("Failed to delete temporary file:", unlinkError.message);
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      fileName: fileName,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    // Clean up local file if upload failed
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.warn(
          "Failed to delete temporary file after upload error:",
          unlinkError.message,
        );
      }
    }

    throw new Error(`Upload to Supabase failed: ${error.message}`);
  }
};

// Middleware wrapper for handling upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 5MB",
        error: "FILE_TOO_LARGE",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Too many files uploaded",
        error: "TOO_MANY_FILES",
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      error: "UPLOAD_ERROR",
    });
  }

  if (err.message.includes("Only image files")) {
    return res.status(400).json({
      message:
        "Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed",
      error: "INVALID_FILE_TYPE",
    });
  }

  return res.status(500).json({
    message: "File upload failed",
    error: "UPLOAD_FAILED",
  });
};

module.exports = {
  upload,
  uploadToSupabase,
  handleUploadError,
};
