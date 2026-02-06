const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const { supabase } = require("../config/supabase");
const {
  upload,
  uploadToSupabase,
  handleUploadError,
} = require("../middleware/upload");
const router = express.Router();

// Validation helper
const validateUserData = (data) => {
  const { nom, numero, location, availableDays } = data;
  const errors = [];

  if (nom !== undefined && (!nom || nom.trim().length < 2)) {
    errors.push("Name must be at least 2 characters if provided");
  }
  if (numero !== undefined && numero && numero.trim().length < 3) {
    errors.push("Phone number must be at least 3 characters if provided");
  }
  if (location !== undefined && (!location || location.trim().length < 2)) {
    errors.push("Location must be at least 2 characters if provided");
  }
  if (availableDays !== undefined && !Array.isArray(availableDays)) {
    errors.push("Available days must be an array if provided");
  }

  return errors;
};

// GET /:id - Get user profile by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
        error: "INVALID_USER_ID",
      });
    }

    // Fetch user with all related data
    const { data: user, error } = await supabase
      .from("users")
      .select(
        `
        *,
        projects!projects_creator_id_fkey (
          id,
          location,
          min_person_req,
          needs_transportation,
          has_kids,
          has_elderly,
          has_shelter,
          priority,
          status,
          created_at
        ),
        project_volunteers (
          id,
          joined_at,
          projects (
            id,
            location,
            status,
            priority,
            created_at,
            users!projects_creator_id_fkey (
              id,
              nom,
              email
            )
          )
        ),
        outils!outils_posted_by_fkey (
          id,
          nom,
          photo,
          location,
          duree_max,
          available,
          created_at
        ),
        materiel!materiel_posted_by_fkey (
          id,
          nom,
          photo,
          location,
          created_at
        ),
        transport!transport_posted_by_fkey (
          id,
          nom,
          numero,
          photo,
          location,
          duree_max,
          created_at
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND",
        });
      }
      console.error("Get user error:", error);
      return res.status(500).json({
        message: "Failed to fetch user",
        error: "USER_FETCH_FAILED",
      });
    }

    // Format the response
    const userProfile = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      numero: user.numero,
      location: user.location,
      photo: user.photo,
      available_days: user.available_days,
      created_at: user.created_at,
      projects_created: user.projects || [],
      projects_volunteered:
        user.project_volunteers?.map((pv) => ({
          volunteer_info: {
            id: pv.id,
            joined_at: pv.joined_at,
          },
          project: pv.projects,
        })) || [],
      outils_posted: user.outils || [],
      materiel_posted: user.materiel || [],
      transport_posted: user.transport || [],
    };

    res.json({
      message: "User profile retrieved successfully",
      user: userProfile,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// PATCH /:id - Update user profile (protected, self only)
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
        error: "INVALID_USER_ID",
      });
    }

    if (req.user.id !== id) {
      return res.status(403).json({
        message: "You can only update your own profile",
        error: "UNAUTHORIZED_UPDATE",
      });
    }

    // Remove restricted fields
    const { id: _, email, created_at, ...allowedUpdates } = updates;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
        error: "NO_UPDATES_PROVIDED",
      });
    }

    // Validate updates
    const validationErrors = validateUserData(allowedUpdates);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    Object.keys(allowedUpdates).forEach((key) => {
      switch (key) {
        case "availableDays":
          dbUpdates.available_days = allowedUpdates[key];
          break;
        default:
          if (typeof allowedUpdates[key] === "string") {
            dbUpdates[key] = allowedUpdates[key].trim();
          } else {
            dbUpdates[key] = allowedUpdates[key];
          }
      }
    });

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("User update error:", updateError);
      return res.status(500).json({
        message: "Failed to update user profile",
        error: "USER_UPDATE_FAILED",
      });
    }

    res.json({
      message: "User profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nom: updatedUser.nom,
        numero: updatedUser.numero,
        location: updatedUser.location,
        photo: updatedUser.photo,
        available_days: updatedUser.available_days,
        created_at: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /:id/photo - Update user photo (protected, self only)
router.post(
  "/:id/photo",
  authenticateUser,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          message: "User ID is required",
          error: "INVALID_USER_ID",
        });
      }

      if (req.user.id !== id) {
        return res.status(403).json({
          message: "You can only update your own photo",
          error: "UNAUTHORIZED_UPDATE",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Photo file is required",
          error: "PHOTO_REQUIRED",
        });
      }

      // Get current user data to check for existing photo
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("photo")
        .eq("id", id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return res.status(404).json({
            message: "User not found",
            error: "USER_NOT_FOUND",
          });
        }
        console.error("User fetch error:", fetchError);
        return res.status(500).json({
          message: "Failed to fetch user",
          error: "USER_FETCH_FAILED",
        });
      }

      // Upload new photo
      let newPhotoUrl;
      try {
        const uploadResult = await uploadToSupabase(req.file, "user-photos");
        newPhotoUrl = uploadResult.publicUrl;
      } catch (uploadError) {
        console.error("Photo upload error:", uploadError);
        return res.status(400).json({
          message: "Photo upload failed",
          error: "PHOTO_UPLOAD_FAILED",
        });
      }

      // Update user with new photo URL
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({ photo: newPhotoUrl })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("User photo update error:", updateError);
        return res.status(500).json({
          message: "Failed to update user photo",
          error: "PHOTO_UPDATE_FAILED",
        });
      }

      // TODO: Delete old photo from storage if it exists
      // This would require extracting the file path from the old photo URL
      // and calling supabase.storage.from('user-photos').remove([oldPhotoPath])

      res.json({
        message: "User photo updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          nom: updatedUser.nom,
          numero: updatedUser.numero,
          location: updatedUser.location,
          photo: updatedUser.photo,
          available_days: updatedUser.available_days,
          created_at: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error("Update user photo error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  },
  handleUploadError,
);

module.exports = router;
