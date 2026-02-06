const express = require("express");
const { supabase, supabaseAdmin } = require("../config/supabase");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Validation helper function
const validateRegistrationData = (data) => {
  const { email, password, nom, availableDays } = data;
  const errors = [];

  if (!email || !email.includes("@")) {
    errors.push("Valid email is required");
  }
  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }
  if (!nom || nom.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }
  if (availableDays && !Array.isArray(availableDays)) {
    errors.push("Available days must be an array");
  }

  return errors;
};

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { email, password, nom, numero, location, availableDays } = req.body;

    // Validate input data
    const validationErrors = validateRegistrationData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Create auth user with Supabase using Admin client to bypass email sending constraints
    // This auto-confirms the user and avoids "Email rate limit exceeded" errors
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nom }, // Optional: store name in metadata too
      });

    if (authError) {
      // Handle specific auth errors
      if (
        authError.message.includes("already registered") ||
        authError.message.includes("already been registered")
      ) {
        return res.status(409).json({
          message: "Email already registered",
          error: "EMAIL_ALREADY_EXISTS",
        });
      }
      return res.status(400).json({
        message: authError.message,
        error: "AUTH_ERROR",
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        message: "Failed to create user account",
        error: "USER_CREATION_FAILED",
      });
    }

    // Insert user profile data into users table using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        nom: nom.trim(),
        numero: numero ? numero.trim() : null,
        location: location ? location.trim() : null,
        available_days: availableDays || [],
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // If profile creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return res.status(500).json({
        message: "Failed to create user profile",
        error: "PROFILE_CREATION_FAILED",
      });
    }

    // Since admin.createUser doesn't return a session, we need to sign in manually
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      // This is unlikely if creation just succeeded, but handle it gracefully
      console.error("Auto-login error after registration:", signInError);
      return res.status(201).json({
        message:
          "User registered successfully, but auto-login failed. Please log in.",
        user: {
          id: userProfile.id,
          // ... user profile fields
        },
        session: null,
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        nom: userProfile.nom,
        numero: userProfile.numero,
        location: userProfile.location,
        available_days: userProfile.available_days,
      },
      session: signInData.session,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        error: "MISSING_CREDENTIALS",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle specific login errors
      if (error.message.includes("Invalid login credentials")) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "INVALID_CREDENTIALS",
        });
      }
      if (error.message.includes("Email not confirmed")) {
        return res.status(401).json({
          message: "Please confirm your email before logging in",
          error: "EMAIL_NOT_CONFIRMED",
        });
      }
      return res.status(400).json({
        message: error.message,
        error: "AUTH_ERROR",
      });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        message: "Authentication failed",
        error: "AUTH_FAILED",
      });
    }

    // Fetch user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      // Still return auth data even if profile fetch fails
      return res.json({
        message: "Login successful",
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session,
        warning: "Could not fetch full profile",
      });
    }

    res.json({
      message: "Login successful",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        nom: userProfile.nom,
        numero: userProfile.numero,
        location: userProfile.location,
        photo: userProfile.photo,
        available_days: userProfile.available_days,
        created_at: userProfile.created_at,
      },
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /me (protected)
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch full user profile from users table
    const { data: userProfile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: "User profile not found",
          error: "PROFILE_NOT_FOUND",
        });
      }
      return res.status(500).json({
        message: "Failed to fetch user profile",
        error: "PROFILE_FETCH_FAILED",
      });
    }

    res.json({
      message: "User profile retrieved successfully",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        nom: userProfile.nom,
        numero: userProfile.numero,
        location: userProfile.location,
        photo: userProfile.photo,
        available_days: userProfile.available_days,
        created_at: userProfile.created_at,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /logout (protected)
router.post("/logout", authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return res.status(400).json({
        message: error.message,
        error: "LOGOUT_FAILED",
      });
    }

    res.json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR",
    });
  }
});

module.exports = router;
