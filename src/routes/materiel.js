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
const validateMaterielData = (data) => {
  const { nom, location } = data;
  const errors = [];

  if (!nom || nom.trim().length < 2) {
    errors.push("Material name is required and must be at least 2 characters");
  }
  if (!location || location.trim().length < 2) {
    errors.push("Location is required and must be at least 2 characters");
  }

  return errors;
};

// POST / - Create new materiel (protected) with photo upload
router.post(
  "/",
  authenticateUser,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { nom, location } = req.body;

      // Validate input data
      const validationErrors = validateMaterielData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      let photoUrl = null;

      // Handle photo upload if provided
      if (req.file) {
        try {
          const uploadResult = await uploadToSupabase(
            req.file,
            "materiel-photos",
          );
          photoUrl = uploadResult.publicUrl;
        } catch (uploadError) {
          console.error("Photo upload error:", uploadError);
          return res.status(400).json({
            message: "Photo upload failed",
            error: "PHOTO_UPLOAD_FAILED",
          });
        }
      }

      // Insert materiel
      const { data: materiel, error: materielError } = await supabase
        .from("materiel")
        .insert({
          posted_by: req.user.id,
          nom: nom.trim(),
          photo: photoUrl,
          location: location.trim(),
        })
        .select(
          `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location
        )
      `,
        )
        .single();

      if (materielError) {
        console.error("Materiel creation error:", materielError);
        return res.status(500).json({
          message: "Failed to create materiel",
          error: "MATERIEL_CREATION_FAILED",
        });
      }

      res.status(201).json({
        message: "Materiel created successfully",
        materiel: {
          id: materiel.id,
          nom: materiel.nom,
          photo: materiel.photo,
          location: materiel.location,
          created_at: materiel.created_at,
          posted_by: materiel.users,
        },
      });
    } catch (error) {
      console.error("Create materiel error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  },
  handleUploadError,
);

// GET / - Get all materiel
router.get("/", async (req, res) => {
  try {
    const { location, search } = req.query;

    let query = supabase
      .from("materiel")
      .select(
        `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location
        )
      `,
      )
      .order("created_at", { ascending: false });

    // Filter by location if provided
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    // Search by material name if provided
    if (search) {
      query = query.ilike("nom", `%${search}%`);
    }

    const { data: materielList, error } = await query;

    if (error) {
      console.error("Get materiel error:", error);
      return res.status(500).json({
        message: "Failed to fetch materiel",
        error: "MATERIEL_FETCH_FAILED",
      });
    }

    const formattedMateriel = materielList.map((item) => ({
      id: item.id,
      nom: item.nom,
      photo: item.photo,
      location: item.location,
      created_at: item.created_at,
      posted_by: item.users,
    }));

    res.json({
      message: "Materiel retrieved successfully",
      materiel: formattedMateriel,
      total: formattedMateriel.length,
    });
  } catch (error) {
    console.error("Get materiel error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /:id - Get single materiel
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid materiel ID",
        error: "INVALID_MATERIEL_ID",
      });
    }

    const { data: materiel, error } = await supabase
      .from("materiel")
      .select(
        `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location,
          photo as user_photo
        ),
        materiel_offerings (
          id,
          status,
          created_at,
          users!materiel_offerings_offered_by_fkey (
            id,
            nom,
            email
          ),
          projects (
            id,
            location,
            status,
            users!projects_creator_id_fkey (
              id,
              nom,
              email
            )
          )
        )
      `,
      )
      .eq("id", parseInt(id))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: "Materiel not found",
          error: "MATERIEL_NOT_FOUND",
        });
      }
      console.error("Get materiel error:", error);
      return res.status(500).json({
        message: "Failed to fetch materiel",
        error: "MATERIEL_FETCH_FAILED",
      });
    }

    res.json({
      message: "Materiel retrieved successfully",
      materiel: {
        id: materiel.id,
        nom: materiel.nom,
        photo: materiel.photo,
        location: materiel.location,
        created_at: materiel.created_at,
        posted_by: materiel.users,
        offerings: materiel.materiel_offerings,
      },
    });
  } catch (error) {
    console.error("Get materiel error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// PATCH /:id - Update materiel (protected, owner only)
router.patch(
  "/:id",
  authenticateUser,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          message: "Invalid materiel ID",
          error: "INVALID_MATERIEL_ID",
        });
      }

      // Remove restricted fields
      const { id: _, posted_by, created_at, ...allowedUpdates } = updates;

      if (Object.keys(allowedUpdates).length === 0 && !req.file) {
        return res.status(400).json({
          message: "No valid fields to update",
          error: "NO_UPDATES_PROVIDED",
        });
      }

      // Validate updates if provided
      if (allowedUpdates.nom || allowedUpdates.location) {
        const validationErrors = validateMaterielData({
          nom: allowedUpdates.nom,
          location: allowedUpdates.location,
        });
        if (validationErrors.length > 0) {
          return res.status(400).json({
            message: "Validation failed",
            errors: validationErrors,
          });
        }
      }

      // Check if user owns the materiel
      const { data: materiel, error: fetchError } = await supabase
        .from("materiel")
        .select("posted_by")
        .eq("id", parseInt(id))
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return res.status(404).json({
            message: "Materiel not found",
            error: "MATERIEL_NOT_FOUND",
          });
        }
        console.error("Materiel fetch error:", fetchError);
        return res.status(500).json({
          message: "Failed to fetch materiel",
          error: "MATERIEL_FETCH_FAILED",
        });
      }

      if (materiel.posted_by !== req.user.id) {
        return res.status(403).json({
          message: "Only materiel owner can update this materiel",
          error: "UNAUTHORIZED_UPDATE",
        });
      }

      // Handle photo upload if provided
      if (req.file) {
        try {
          const uploadResult = await uploadToSupabase(
            req.file,
            "materiel-photos",
          );
          allowedUpdates.photo = uploadResult.publicUrl;
        } catch (uploadError) {
          console.error("Photo upload error:", uploadError);
          return res.status(400).json({
            message: "Photo upload failed",
            error: "PHOTO_UPLOAD_FAILED",
          });
        }
      }

      // Trim string fields
      if (allowedUpdates.nom) {
        allowedUpdates.nom = allowedUpdates.nom.trim();
      }
      if (allowedUpdates.location) {
        allowedUpdates.location = allowedUpdates.location.trim();
      }

      const { data: updatedMateriel, error: updateError } = await supabase
        .from("materiel")
        .update(allowedUpdates)
        .eq("id", parseInt(id))
        .select(
          `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location
        )
      `,
        )
        .single();

      if (updateError) {
        console.error("Materiel update error:", updateError);
        return res.status(500).json({
          message: "Failed to update materiel",
          error: "MATERIEL_UPDATE_FAILED",
        });
      }

      res.json({
        message: "Materiel updated successfully",
        materiel: {
          id: updatedMateriel.id,
          nom: updatedMateriel.nom,
          photo: updatedMateriel.photo,
          location: updatedMateriel.location,
          created_at: updatedMateriel.created_at,
          posted_by: updatedMateriel.users,
        },
      });
    } catch (error) {
      console.error("Update materiel error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  },
  handleUploadError,
);

// DELETE /:id - Delete materiel (protected, owner only)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid materiel ID",
        error: "INVALID_MATERIEL_ID",
      });
    }

    // Check if user owns the materiel
    const { data: materiel, error: fetchError } = await supabase
      .from("materiel")
      .select("posted_by, nom")
      .eq("id", parseInt(id))
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          message: "Materiel not found",
          error: "MATERIEL_NOT_FOUND",
        });
      }
      console.error("Materiel fetch error:", fetchError);
      return res.status(500).json({
        message: "Failed to fetch materiel",
        error: "MATERIEL_FETCH_FAILED",
      });
    }

    if (materiel.posted_by !== req.user.id) {
      return res.status(403).json({
        message: "Only materiel owner can delete this materiel",
        error: "UNAUTHORIZED_DELETE",
      });
    }

    const { error: deleteError } = await supabase
      .from("materiel")
      .delete()
      .eq("id", parseInt(id));

    if (deleteError) {
      console.error("Materiel delete error:", deleteError);
      return res.status(500).json({
        message: "Failed to delete materiel",
        error: "MATERIEL_DELETE_FAILED",
      });
    }

    res.json({
      message: "Materiel deleted successfully",
      deleted_materiel_id: parseInt(id),
      deleted_materiel_name: materiel.nom,
    });
  } catch (error) {
    console.error("Delete materiel error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /:id/offer - Offer materiel to project (protected)
router.post("/:id/offer", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid materiel ID",
        error: "INVALID_MATERIEL_ID",
      });
    }

    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        message: "Valid project ID is required",
        error: "INVALID_PROJECT_ID",
      });
    }

    // Check if materiel exists
    const { data: materiel, error: materielError } = await supabase
      .from("materiel")
      .select("id, nom, posted_by")
      .eq("id", parseInt(id))
      .single();

    if (materielError) {
      if (materielError.code === "PGRST116") {
        return res.status(404).json({
          message: "Materiel not found",
          error: "MATERIEL_NOT_FOUND",
        });
      }
      console.error("Materiel fetch error:", materielError);
      return res.status(500).json({
        message: "Failed to fetch materiel",
        error: "MATERIEL_FETCH_FAILED",
      });
    }

    // Check if project exists and is not completed
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status, location")
      .eq("id", parseInt(projectId))
      .single();

    if (projectError) {
      if (projectError.code === "PGRST116") {
        return res.status(404).json({
          message: "Project not found",
          error: "PROJECT_NOT_FOUND",
        });
      }
      console.error("Project fetch error:", projectError);
      return res.status(500).json({
        message: "Failed to fetch project",
        error: "PROJECT_FETCH_FAILED",
      });
    }

    if (project.status === "completed") {
      return res.status(400).json({
        message: "Cannot offer materials to completed projects",
        error: "PROJECT_COMPLETED",
      });
    }

    // Insert materiel offering
    const { data: offering, error: offeringError } = await supabase
      .from("materiel_offerings")
      .insert({
        project_id: parseInt(projectId),
        materiel_id: parseInt(id),
        offered_by: req.user.id,
      })
      .select(
        `
        *,
        projects (
          id,
          location,
          status,
          users!projects_creator_id_fkey (
            id,
            nom,
            email
          )
        ),
        materiel (
          id,
          nom,
          location
        )
      `,
      )
      .single();

    if (offeringError) {
      if (offeringError.code === "23505") {
        return res.status(409).json({
          message: "Materiel already offered to this project",
          error: "MATERIEL_ALREADY_OFFERED",
        });
      }
      console.error("Materiel offering error:", offeringError);
      return res.status(500).json({
        message: "Failed to offer materiel",
        error: "MATERIEL_OFFER_FAILED",
      });
    }

    res.json({
      message: "Materiel offered successfully",
      offering: {
        id: offering.id,
        status: offering.status,
        created_at: offering.created_at,
        materiel: offering.materiel,
        project: offering.projects,
      },
    });
  } catch (error) {
    console.error("Offer materiel error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

module.exports = router;
