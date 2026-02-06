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
const validateTransportData = (data) => {
  const { nom, location, numero, dureeMax } = data;
  const errors = [];

  if (!nom || nom.trim().length < 2) {
    errors.push("Transport name is required and must be at least 2 characters");
  }
  if (!location || location.trim().length < 2) {
    errors.push("Location is required and must be at least 2 characters");
  }
  if (numero && numero.trim().length < 3) {
    errors.push("Contact number must be at least 3 characters if provided");
  }
  if (dureeMax !== undefined && (!Number.isInteger(dureeMax) || dureeMax < 1)) {
    errors.push("Maximum duration must be a positive integer if provided");
  }

  return errors;
};

// POST / - Create new transport (protected) with photo upload
router.post(
  "/",
  authenticateUser,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { nom, location, numero, dureeMax } = req.body;

      // Validate input data
      const validationErrors = validateTransportData(req.body);
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
            "transport-photos",
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

      // Insert transport
      const { data: transport, error: transportError } = await supabase
        .from("transport")
        .insert({
          posted_by: req.user.id,
          nom: nom.trim(),
          numero: numero ? numero.trim() : null,
          photo: photoUrl,
          location: location.trim(),
          duree_max: dureeMax ? parseInt(dureeMax) : null,
        })
        .select(
          `
        *,
        users!transport_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location
        )
      `,
        )
        .single();

      if (transportError) {
        console.error("Transport creation error:", transportError);
        return res.status(500).json({
          message: "Failed to create transport",
          error: "TRANSPORT_CREATION_FAILED",
        });
      }

      res.status(201).json({
        message: "Transport created successfully",
        transport: {
          id: transport.id,
          nom: transport.nom,
          numero: transport.numero,
          photo: transport.photo,
          location: transport.location,
          duree_max: transport.duree_max,
          created_at: transport.created_at,
          posted_by: transport.users,
        },
      });
    } catch (error) {
      console.error("Create transport error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  },
  handleUploadError,
);

// GET / - Get all transport
router.get("/", async (req, res) => {
  try {
    const { location, search } = req.query;

    let query = supabase
      .from("transport")
      .select(
        `
        *,
        users!transport_posted_by_fkey (
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

    // Search by transport name if provided
    if (search) {
      query = query.ilike("nom", `%${search}%`);
    }

    const { data: transportList, error } = await query;

    if (error) {
      console.error("Get transport error:", error);
      return res.status(500).json({
        message: "Failed to fetch transport",
        error: "TRANSPORT_FETCH_FAILED",
      });
    }

    const formattedTransport = transportList.map((item) => ({
      id: item.id,
      nom: item.nom,
      numero: item.numero,
      photo: item.photo,
      location: item.location,
      duree_max: item.duree_max,
      created_at: item.created_at,
      posted_by: item.users,
    }));

    res.json({
      message: "Transport retrieved successfully",
      transport: formattedTransport,
      total: formattedTransport.length,
    });
  } catch (error) {
    console.error("Get transport error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /:id - Get single transport
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid transport ID",
        error: "INVALID_TRANSPORT_ID",
      });
    }

    const { data: transport, error } = await supabase
      .from("transport")
      .select(
        `
        *,
        users!transport_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location,
          photo as user_photo
        ),
        transport_offerings (
          id,
          status,
          created_at,
          users!transport_offerings_offered_by_fkey (
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
          message: "Transport not found",
          error: "TRANSPORT_NOT_FOUND",
        });
      }
      console.error("Get transport error:", error);
      return res.status(500).json({
        message: "Failed to fetch transport",
        error: "TRANSPORT_FETCH_FAILED",
      });
    }

    res.json({
      message: "Transport retrieved successfully",
      transport: {
        id: transport.id,
        nom: transport.nom,
        numero: transport.numero,
        photo: transport.photo,
        location: transport.location,
        duree_max: transport.duree_max,
        created_at: transport.created_at,
        posted_by: transport.users,
        offerings: transport.transport_offerings,
      },
    });
  } catch (error) {
    console.error("Get transport error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// PATCH /:id - Update transport (protected, owner only)
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
          message: "Invalid transport ID",
          error: "INVALID_TRANSPORT_ID",
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
      if (
        allowedUpdates.nom ||
        allowedUpdates.location ||
        allowedUpdates.numero ||
        allowedUpdates.dureeMax
      ) {
        const validationErrors = validateTransportData({
          nom: allowedUpdates.nom,
          location: allowedUpdates.location,
          numero: allowedUpdates.numero,
          dureeMax: allowedUpdates.dureeMax || allowedUpdates.duree_max,
        });
        if (validationErrors.length > 0) {
          return res.status(400).json({
            message: "Validation failed",
            errors: validationErrors,
          });
        }
      }

      // Check if user owns the transport
      const { data: transport, error: fetchError } = await supabase
        .from("transport")
        .select("posted_by")
        .eq("id", parseInt(id))
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return res.status(404).json({
            message: "Transport not found",
            error: "TRANSPORT_NOT_FOUND",
          });
        }
        console.error("Transport fetch error:", fetchError);
        return res.status(500).json({
          message: "Failed to fetch transport",
          error: "TRANSPORT_FETCH_FAILED",
        });
      }

      if (transport.posted_by !== req.user.id) {
        return res.status(403).json({
          message: "Only transport owner can update this transport",
          error: "UNAUTHORIZED_UPDATE",
        });
      }

      // Handle photo upload if provided
      if (req.file) {
        try {
          const uploadResult = await uploadToSupabase(
            req.file,
            "transport-photos",
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

      // Convert camelCase to snake_case for database
      const dbUpdates = {};
      Object.keys(allowedUpdates).forEach((key) => {
        switch (key) {
          case "dureeMax":
            dbUpdates.duree_max = allowedUpdates[key]
              ? parseInt(allowedUpdates[key])
              : null;
            break;
          default:
            if (typeof allowedUpdates[key] === "string") {
              dbUpdates[key] = allowedUpdates[key].trim();
            } else {
              dbUpdates[key] = allowedUpdates[key];
            }
        }
      });

      const { data: updatedTransport, error: updateError } = await supabase
        .from("transport")
        .update(dbUpdates)
        .eq("id", parseInt(id))
        .select(
          `
        *,
        users!transport_posted_by_fkey (
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
        console.error("Transport update error:", updateError);
        return res.status(500).json({
          message: "Failed to update transport",
          error: "TRANSPORT_UPDATE_FAILED",
        });
      }

      res.json({
        message: "Transport updated successfully",
        transport: {
          id: updatedTransport.id,
          nom: updatedTransport.nom,
          numero: updatedTransport.numero,
          photo: updatedTransport.photo,
          location: updatedTransport.location,
          duree_max: updatedTransport.duree_max,
          created_at: updatedTransport.created_at,
          posted_by: updatedTransport.users,
        },
      });
    } catch (error) {
      console.error("Update transport error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  },
  handleUploadError,
);

// DELETE /:id - Delete transport (protected, owner only)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid transport ID",
        error: "INVALID_TRANSPORT_ID",
      });
    }

    // Check if user owns the transport
    const { data: transport, error: fetchError } = await supabase
      .from("transport")
      .select("posted_by, nom")
      .eq("id", parseInt(id))
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          message: "Transport not found",
          error: "TRANSPORT_NOT_FOUND",
        });
      }
      console.error("Transport fetch error:", fetchError);
      return res.status(500).json({
        message: "Failed to fetch transport",
        error: "TRANSPORT_FETCH_FAILED",
      });
    }

    if (transport.posted_by !== req.user.id) {
      return res.status(403).json({
        message: "Only transport owner can delete this transport",
        error: "UNAUTHORIZED_DELETE",
      });
    }

    const { error: deleteError } = await supabase
      .from("transport")
      .delete()
      .eq("id", parseInt(id));

    if (deleteError) {
      console.error("Transport delete error:", deleteError);
      return res.status(500).json({
        message: "Failed to delete transport",
        error: "TRANSPORT_DELETE_FAILED",
      });
    }

    res.json({
      message: "Transport deleted successfully",
      deleted_transport_id: parseInt(id),
      deleted_transport_name: transport.nom,
    });
  } catch (error) {
    console.error("Delete transport error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /:id/offer - Offer transport to project (protected)
router.post("/:id/offer", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid transport ID",
        error: "INVALID_TRANSPORT_ID",
      });
    }

    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        message: "Valid project ID is required",
        error: "INVALID_PROJECT_ID",
      });
    }

    // Check if transport exists
    const { data: transport, error: transportError } = await supabase
      .from("transport")
      .select("id, nom, posted_by")
      .eq("id", parseInt(id))
      .single();

    if (transportError) {
      if (transportError.code === "PGRST116") {
        return res.status(404).json({
          message: "Transport not found",
          error: "TRANSPORT_NOT_FOUND",
        });
      }
      console.error("Transport fetch error:", transportError);
      return res.status(500).json({
        message: "Failed to fetch transport",
        error: "TRANSPORT_FETCH_FAILED",
      });
    }

    // Check if project exists and is not completed
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status, location, needs_transportation")
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
        message: "Cannot offer transport to completed projects",
        error: "PROJECT_COMPLETED",
      });
    }

    // Insert transport offering
    const { data: offering, error: offeringError } = await supabase
      .from("transport_offerings")
      .insert({
        project_id: parseInt(projectId),
        transport_id: parseInt(id),
        offered_by: req.user.id,
      })
      .select(
        `
        *,
        projects (
          id,
          location,
          status,
          needs_transportation,
          users!projects_creator_id_fkey (
            id,
            nom,
            email
          )
        ),
        transport (
          id,
          nom,
          numero,
          location,
          duree_max
        )
      `,
      )
      .single();

    if (offeringError) {
      if (offeringError.code === "23505") {
        return res.status(409).json({
          message: "Transport already offered to this project",
          error: "TRANSPORT_ALREADY_OFFERED",
        });
      }
      console.error("Transport offering error:", offeringError);
      return res.status(500).json({
        message: "Failed to offer transport",
        error: "TRANSPORT_OFFER_FAILED",
      });
    }

    res.json({
      message: "Transport offered successfully",
      offering: {
        id: offering.id,
        status: offering.status,
        created_at: offering.created_at,
        transport: offering.transport,
        project: offering.projects,
      },
    });
  } catch (error) {
    console.error("Offer transport error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

module.exports = router;
