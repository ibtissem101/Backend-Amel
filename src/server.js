const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/auth");
const projectsRoutes = require("./routes/projects");
const outilsRoutes = require("./routes/outils");
const materielRoutes = require("./routes/materiel");
const transportRoutes = require("./routes/transport");
const usersRoutes = require("./routes/users");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/outils", outilsRoutes);
app.use("/api/materiel", materielRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/users", usersRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    error: "ROUTE_NOT_FOUND",
    path: req.originalUrl,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log errors in development
  if (process.env.NODE_ENV !== "production") {
    console.error("Error details:", err.stack);
    console.error("Request URL:", req.originalUrl);
    console.error("Request method:", req.method);
    console.error("Request body:", req.body);
  } else {
    // In production, log only essential error info
    console.error("Error:", err.message);
  }

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate entry";
  }

  res.status(statusCode).json({
    message: message,
    error: err.name || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
