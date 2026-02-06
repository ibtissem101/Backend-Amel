const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const { supabase } = require("../config/supabase");
const router = express.Router();

// Validation helper
const validateProjectData = (data) => {
  const {
    location,
    minPersonReq,
    needsTransportation,
    hasKids,
    hasElderly,
    hasShelter,
  } = data;
  const errors = [];

  if (!location || location.trim().length < 2) {
    errors.push("Location is required and must be at least 2 characters");
  }
  if (!minPersonReq || minPersonReq < 1 || !Number.isInteger(minPersonReq)) {
    errors.push("Minimum person requirement must be a positive integer");
  }
  if (
    needsTransportation !== undefined &&
    typeof needsTransportation !== "boolean"
  ) {
    errors.push("needsTransportation must be a boolean");
  }
  if (hasKids !== undefined && typeof hasKids !== "boolean") {
    errors.push("hasKids must be a boolean");
  }
  if (hasElderly !== undefined && typeof hasElderly !== "boolean") {
    errors.push("hasElderly must be a boolean");
  }
  if (hasShelter !== undefined && typeof hasShelter !== "boolean") {
    errors.push("hasShelter must be a boolean");
  }

  return errors;
};

// POST / - Create new project (protected)
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      location,
      minPersonReq,
      needsTransportation = false,
      hasKids = false,
      hasElderly = false,
      hasShelter = true,
      requestedOutilIds = [],
    } = req.body;

    // Validate input data
    const validationErrors = validateProjectData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Insert project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        creator_id: req.user.id,
        location: location.trim(),
        min_person_req: minPersonReq,
        needs_transportation: needsTransportation,
        has_kids: hasKids,
        has_elderly: hasElderly,
        has_shelter: hasShelter,
      })
      .select()
      .single();

    if (projectError) {
      console.error("Project creation error:", projectError);
      return res.status(500).json({
        message: "Failed to create project",
        error: "PROJECT_CREATION_FAILED",
      });
    }

    // Insert requested outils if provided
    if (requestedOutilIds && requestedOutilIds.length > 0) {
      const outilRequests = requestedOutilIds.map((outilId) => ({
        project_id: project.id,
        outil_id: outilId,
      }));

      const { error: outilRequestError } = await supabase
        .from("project_outil_requests")
        .insert(outilRequests);

      if (outilRequestError) {
        console.error("Outil requests error:", outilRequestError);
        // Don't fail the project creation, but log the error
      }
    }

    res.status(201).json({
      message: "Project created successfully",
      project: {
        id: project.id,
        creator_id: project.creator_id,
        location: project.location,
        min_person_req: project.min_person_req,
        needs_transportation: project.needs_transportation,
        has_kids: project.has_kids,
        has_elderly: project.has_elderly,
        has_shelter: project.has_shelter,
        priority: project.priority,
        status: project.status,
        created_at: project.created_at,
      },
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET / - Get all projects
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("projects")
      .select(
        `
        *,
        users!projects_creator_id_fkey (
          id,
          nom,
          email,
          location as user_location
        ),
        project_volunteers (count)
      `,
      )
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (status) {
      if (!["open", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be: open, in_progress, or completed",
          error: "INVALID_STATUS",
        });
      }
      query = query.eq("status", status);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error("Get projects error:", error);
      return res.status(500).json({
        message: "Failed to fetch projects",
        error: "PROJECTS_FETCH_FAILED",
      });
    }

    const formattedProjects = projects.map((project) => ({
      id: project.id,
      location: project.location,
      min_person_req: project.min_person_req,
      needs_transportation: project.needs_transportation,
      has_kids: project.has_kids,
      has_elderly: project.has_elderly,
      has_shelter: project.has_shelter,
      priority: project.priority,
      status: project.status,
      created_at: project.created_at,
      creator: project.users,
      volunteer_count: project.project_volunteers[0]?.count || 0,
    }));

    res.json({
      message: "Projects retrieved successfully",
      projects: formattedProjects,
      total: formattedProjects.length,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /:id - Get project by ID with full details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    const { data: project, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        users!projects_creator_id_fkey (
          id,
          nom,
          email,
          numero,
          location as user_location,
          photo
        ),
        project_volunteers (
          id,
          joined_at,
          users!project_volunteers_volunteer_id_fkey (
            id,
            nom,
            email,
            photo,
            location as user_location
          )
        ),
        project_outil_requests (
          id,
          outils (
            id,
            nom,
            photo,
            location,
            available,
            users!outils_posted_by_fkey (
              id,
              nom,
              email
            )
          )
        ),
        outil_offerings (
          id,
          status,
          created_at,
          outils (
            id,
            nom,
            photo,
            location
          ),
          users!outil_offerings_offered_by_fkey (
            id,
            nom,
            email
          )
        ),
        materiel_offerings (
          id,
          status,
          created_at,
          materiel (
            id,
            nom,
            photo,
            location
          ),
          users!materiel_offerings_offered_by_fkey (
            id,
            nom,
            email
          )
        ),
        transport_offerings (
          id,
          status,
          created_at,
          transport (
            id,
            nom,
            numero,
            photo,
            location
          ),
          users!transport_offerings_offered_by_fkey (
            id,
            nom,
            email
          )
        )
      `,
      )
      .eq("id", parseInt(id))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: "Project not found",
          error: "PROJECT_NOT_FOUND",
        });
      }
      console.error("Get project error:", error);
      return res.status(500).json({
        message: "Failed to fetch project",
        error: "PROJECT_FETCH_FAILED",
      });
    }

    res.json({
      message: "Project retrieved successfully",
      project: {
        id: project.id,
        location: project.location,
        min_person_req: project.min_person_req,
        needs_transportation: project.needs_transportation,
        has_kids: project.has_kids,
        has_elderly: project.has_elderly,
        has_shelter: project.has_shelter,
        priority: project.priority,
        status: project.status,
        created_at: project.created_at,
        creator: project.users,
        volunteers: project.project_volunteers,
        outil_requests: project.project_outil_requests,
        outil_offerings: project.outil_offerings,
        materiel_offerings: project.materiel_offerings,
        transport_offerings: project.transport_offerings,
      },
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// PATCH /:id - Update project (protected, creator only)
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    // Remove restricted fields
    const { id: _, creator_id, created_at, ...allowedUpdates } = updates;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
        error: "NO_UPDATES_PROVIDED",
      });
    }

    // Validate updates
    if (
      allowedUpdates.location ||
      allowedUpdates.minPersonReq ||
      allowedUpdates.min_person_req !== undefined
    ) {
      const validationErrors = validateProjectData({
        location: allowedUpdates.location,
        minPersonReq:
          allowedUpdates.minPersonReq || allowedUpdates.min_person_req,
        needsTransportation:
          allowedUpdates.needsTransportation ||
          allowedUpdates.needs_transportation,
        hasKids: allowedUpdates.hasKids || allowedUpdates.has_kids,
        hasElderly: allowedUpdates.hasElderly || allowedUpdates.has_elderly,
        hasShelter: allowedUpdates.hasShelter || allowedUpdates.has_shelter,
      });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationErrors,
        });
      }
    }

    // Check if user owns the project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("creator_id")
      .eq("id", parseInt(id))
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          message: "Project not found",
          error: "PROJECT_NOT_FOUND",
        });
      }
      console.error("Project fetch error:", fetchError);
      return res.status(500).json({
        message: "Failed to fetch project",
        error: "PROJECT_FETCH_FAILED",
      });
    }

    if (project.creator_id !== req.user.id) {
      return res.status(403).json({
        message: "Only project creator can update this project",
        error: "UNAUTHORIZED_UPDATE",
      });
    }

    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    Object.keys(allowedUpdates).forEach((key) => {
      switch (key) {
        case "minPersonReq":
          dbUpdates.min_person_req = allowedUpdates[key];
          break;
        case "needsTransportation":
          dbUpdates.needs_transportation = allowedUpdates[key];
          break;
        case "hasKids":
          dbUpdates.has_kids = allowedUpdates[key];
          break;
        case "hasElderly":
          dbUpdates.has_elderly = allowedUpdates[key];
          break;
        case "hasShelter":
          dbUpdates.has_shelter = allowedUpdates[key];
          break;
        default:
          dbUpdates[key] = allowedUpdates[key];
      }
    });

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(dbUpdates)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error("Project update error:", updateError);
      return res.status(500).json({
        message: "Failed to update project",
        error: "PROJECT_UPDATE_FAILED",
      });
    }

    res.json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// DELETE /:id - Delete project (protected, creator only)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    // Check if user owns the project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("creator_id, location")
      .eq("id", parseInt(id))
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          message: "Project not found",
          error: "PROJECT_NOT_FOUND",
        });
      }
      console.error("Project fetch error:", fetchError);
      return res.status(500).json({
        message: "Failed to fetch project",
        error: "PROJECT_FETCH_FAILED",
      });
    }

    if (project.creator_id !== req.user.id) {
      return res.status(403).json({
        message: "Only project creator can delete this project",
        error: "UNAUTHORIZED_DELETE",
      });
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", parseInt(id));

    if (deleteError) {
      console.error("Project delete error:", deleteError);
      return res.status(500).json({
        message: "Failed to delete project",
        error: "PROJECT_DELETE_FAILED",
      });
    }

    res.json({
      message: "Project deleted successfully",
      deleted_project_id: parseInt(id),
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /:id/volunteer - Join project as volunteer (protected)
router.post("/:id/volunteer", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", parseInt(id))
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
        message: "Cannot volunteer for completed projects",
        error: "PROJECT_COMPLETED",
      });
    }

    // Insert volunteer record
    const { error: volunteerError } = await supabase
      .from("project_volunteers")
      .insert({
        project_id: parseInt(id),
        volunteer_id: req.user.id,
      });

    if (volunteerError) {
      if (volunteerError.code === "23505") {
        return res.status(409).json({
          message: "You are already volunteering for this project",
          error: "ALREADY_VOLUNTEERING",
        });
      }
      console.error("Volunteer insert error:", volunteerError);
      return res.status(500).json({
        message: "Failed to join project",
        error: "VOLUNTEER_INSERT_FAILED",
      });
    }

    res.json({
      message: "Successfully joined project as volunteer",
      project_id: parseInt(id),
    });
  } catch (error) {
    console.error("Join project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// DELETE /:id/volunteer - Leave project as volunteer (protected)
router.delete("/:id/volunteer", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    const { error: deleteError } = await supabase
      .from("project_volunteers")
      .delete()
      .eq("project_id", parseInt(id))
      .eq("volunteer_id", req.user.id);

    if (deleteError) {
      console.error("Volunteer delete error:", deleteError);
      return res.status(500).json({
        message: "Failed to leave project",
        error: "VOLUNTEER_DELETE_FAILED",
      });
    }

    res.json({
      message: "Successfully left project",
      project_id: parseInt(id),
    });
  } catch (error) {
    console.error("Leave project error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /:id/request-outil - Request tool for project (protected, creator only)
router.post("/:id/request-outil", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { outilId } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    if (!outilId || isNaN(parseInt(outilId))) {
      return res.status(400).json({
        message: "Valid outil ID is required",
        error: "INVALID_OUTIL_ID",
      });
    }

    // Check if user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("creator_id")
      .eq("id", parseInt(id))
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

    if (project.creator_id !== req.user.id) {
      return res.status(403).json({
        message: "Only project creator can request tools",
        error: "UNAUTHORIZED_REQUEST",
      });
    }

    // Check if outil exists
    const { data: outil, error: outilError } = await supabase
      .from("outils")
      .select("id, nom")
      .eq("id", parseInt(outilId))
      .single();

    if (outilError) {
      if (outilError.code === "PGRST116") {
        return res.status(404).json({
          message: "Tool not found",
          error: "OUTIL_NOT_FOUND",
        });
      }
      console.error("Outil fetch error:", outilError);
      return res.status(500).json({
        message: "Failed to fetch tool",
        error: "OUTIL_FETCH_FAILED",
      });
    }

    // Insert tool request
    const { error: requestError } = await supabase
      .from("project_outil_requests")
      .insert({
        project_id: parseInt(id),
        outil_id: parseInt(outilId),
      });

    if (requestError) {
      if (requestError.code === "23505") {
        return res.status(409).json({
          message: "Tool already requested for this project",
          error: "TOOL_ALREADY_REQUESTED",
        });
      }
      console.error("Tool request error:", requestError);
      return res.status(500).json({
        message: "Failed to request tool",
        error: "TOOL_REQUEST_FAILED",
      });
    }

    res.json({
      message: "Tool requested successfully",
      project_id: parseInt(id),
      outil_id: parseInt(outilId),
      outil_name: outil.nom,
    });
  } catch (error) {
    console.error("Request tool error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// PATCH /:id/status - Update project status (protected, creator only)
router.patch("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "Invalid project ID",
        error: "INVALID_PROJECT_ID",
      });
    }

    if (!status || !["open", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Status must be: open, in_progress, or completed",
        error: "INVALID_STATUS",
      });
    }

    // Check if user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("creator_id, status")
      .eq("id", parseInt(id))
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

    if (project.creator_id !== req.user.id) {
      return res.status(403).json({
        message: "Only project creator can update project status",
        error: "UNAUTHORIZED_STATUS_UPDATE",
      });
    }

    if (project.status === status) {
      return res.status(400).json({
        message: `Project is already ${status}`,
        error: "STATUS_UNCHANGED",
      });
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error("Status update error:", updateError);
      return res.status(500).json({
        message: "Failed to update project status",
        error: "STATUS_UPDATE_FAILED",
      });
    }

    res.json({
      message: "Project status updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

module.exports = router;
