const express = require("express");
const { supabase } = require("./src/config/supabase");

const app = express();
app.use(express.json());

app.get("/test-simple", async (req, res) => {
  console.log("Testing simple query...");
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .limit(5);

    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      return res.status(500).json({ error: error.message, details: error });
    }

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Exception:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get("/test-with-join", async (req, res) => {
  console.log("Testing query with join...");
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        users!projects_creator_id_fkey (
          id,
          nom,
          email,
          location
        ),
        project_volunteers (count)
      `,
      )
      .limit(5);

    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      return res.status(500).json({ error: error.message, details: error });
    }

    res.json({ success: true, count: data ? data.length : 0, data });
  } catch (err) {
    console.error("Exception:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.listen(3002, () => {
  console.log("Test server running on port 3002");
});
