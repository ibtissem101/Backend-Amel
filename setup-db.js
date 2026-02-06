const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch"); // You may need to install this
require("dotenv").config();

async function setupDatabase() {
  console.log("🚀 Starting database setup...\n");
  console.log("📋 Checking Supabase connection...");

  // Test connection first
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );

  try {
    // Try to query an existing table (this will fail if no tables exist, which is expected)
    const { data, error } = await supabase.from("users").select("id").limit(1);

    if (error && error.code === "PGRST116") {
      console.log(
        "❌ Tables not found - This is expected, we need to create them",
      );
    } else if (error) {
      console.log("❌ Connection error:", error.message);
      throw error;
    } else {
      console.log("✅ Tables already exist - Database is set up!");
      return;
    }
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    throw error;
  }

  console.log(
    "\n🔧 Since automatic setup is complex, please follow these manual steps:\n",
  );

  console.log("📝 MANUAL SETUP INSTRUCTIONS:");
  console.log("1. 🌐 Open your browser and go to: https://supabase.com");
  console.log("2. 🔑 Sign in to your Supabase account");
  console.log("3. 📊 Open your project dashboard");
  console.log('4. 🛠️  Click on "SQL Editor" in the left sidebar');
  console.log('5. 📄 Copy the contents of "setup-database.sql" file');
  console.log("6. 📝 Paste it into the SQL Editor");
  console.log('7. ▶️  Click "Run" to execute the script');
  console.log('8. ✅ Verify tables are created in "Table Editor"');
  console.log("\n🔄 After setup, restart your server with: node src/server.js");

  console.log(
    "\n📁 The setup-database.sql file contains all the necessary SQL commands.",
  );
  console.log("📍 Location: ./setup-database.sql");
}

// Run the setup
setupDatabase().catch(console.error);
