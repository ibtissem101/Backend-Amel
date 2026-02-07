const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { supabase, supabaseAdmin } = require("../config/supabase");

// Configure Multer storage (Use MemoryStorage to avoid file permission issues on Windows)
const storage = multer.memoryStorage();

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  console.log(`[Upload Middleware] Processing file: ${file.originalname}, mimetype: ${file.mimetype}`);
  
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedExtensions = [".jpeg", ".jpg", ".png", ".webp"];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  console.log(`[Upload Middleware] Extension: ${fileExtension}`);

  if (
    allowedTypes.includes(file.mimetype) &&
    allowedExtensions.includes(fileExtension)
  ) {
    console.log("[Upload Middleware] File accepted");
    cb(null, true);
  } else {
    console.error(`[Upload Middleware] File rejected. Mime: ${file.mimetype}, Ext: ${fileExtension}`);
    cb(new Error("Only image files (JPEG, JPG, PNG, WEBP) are allowed"), false);
  }
};

// Configure Multer with size limit and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Function to upload file to Supabase Storage
const uploadToSupabase = async (file, bucketName = "photos") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    let fileBuffer;
    
    // Support both memory storage (buffer) and disk storage (path)
    if (file.buffer) {
        // Memory storage
        fileBuffer = file.buffer;
        console.log(`[Upload Debug] Using Memory Storage. Buffer length: ${fileBuffer.length}`);
    } else if (file.path) {
        // Disk storage fallback
        const absolutePath = path.resolve(file.path);
        console.log(`[Upload Debug] Reading file from disk: ${absolutePath}`);
        try {
            await fs.access(absolutePath);
            fileBuffer = await fs.readFile(absolutePath);
        } catch (e) {
             throw new Error(`Temporary file not found at ${absolutePath}`);
        }
    } else {
        throw new Error("Invalid file object: No buffer or path found");
    }

    // Generate a unique filename for Supabase storage
    // Sanitize filename to avoid issues with spaces/special characters
    const sanitizedOriginalName = file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_",
    );
    const fileName = `${Date.now()}-${sanitizedOriginalName}`;

    console.log(
      `[Upload Debug] Uploading file to Supabase bucket '${bucketName}': ${fileName}`,
    );

    // Upload to Supabase Storage - USING UPSERT: false because user might want to know if it conflicts, but typically unique name avoids it.
    // NOTE: upsert: true was possibly causing Row Level Security issues if update is restricted but insert is allowed?
    // Let's rely on insert (upsert:false)
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error(
        "[Upload Debug] Supabase Storage Error Object:",
        JSON.stringify(error, null, 2),
      );
      const status = error.statusCode || error.status || 500;
      // Provide actionable error messages
      if (status == "403") {
        throw new Error(
          `Permission denied (403). Check RLS policies or Service Key config. Msg: ${error.message}`,
        );
      }
      throw new Error(
        `Supabase upload failed: ${error.message} (Status: ${status})`,
      );
    }

    console.log("[Upload Debug] Upload success:", data);
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
        message: "File too large. Maximum size is 10MB",
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
