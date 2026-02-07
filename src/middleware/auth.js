const { supabase } = require("../config/supabase");

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check for missing Authorization header
    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header is required",
        error: "MISSING_AUTH_HEADER",
      });
    }

    // Check for malformed Authorization header
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization header must be in format: Bearer <token>",
        error: "MALFORMED_AUTH_HEADER",
      });
    }

    const token = authHeader.split(" ")[1];

    // Check for empty token
    if (!token || token.trim() === "") {
      return res.status(401).json({
        message: "Access token cannot be empty",
        error: "EMPTY_TOKEN",
      });
    }

    // Debugging: Log token issues (remove in production)
    if (token === "undefined" || token === "null") {
      console.error(
        "Auth middleware: Token is strictly 'undefined' or 'null' string",
      );
      return res.status(401).json({
        message: "Token is undefined or null",
        error: "INVALID_TOKEN_VALUE",
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    // Handle specific Supabase auth errors
    if (error) {
      console.error(
        "Supabase Auth Error:",
        error.message,
        "Token start:",
        token.substring(0, 10),
      ); // Log the error to see why it's invalid

      if (error.message?.includes("JWT expired")) {
        return res.status(401).json({
          message: "Token has expired",
          error: "EXPIRED_TOKEN",
        });
      }
      if (
        error.message?.includes("invalid JWT") ||
        error.message?.includes("malformed")
      ) {
        return res.status(401).json({
          message: "Invalid token format (Supabase rejected JWT)",
          error: "INVALID_TOKEN_FORMAT",
          details: error.message,
        });
      }
      return res.status(401).json({
        message: "Invalid token",
        error: "INVALID_TOKEN",
        details: error.message,
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "User not found or token is invalid",
        error: "USER_NOT_FOUND",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      message: "Internal authentication error",
      error: "INTERNAL_AUTH_ERROR",
    });
  }
};

module.exports = {
  authenticateUser,
};
