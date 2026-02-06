const { supabase } = require("./src/config/supabase");

async function checkTablesAndPolicies() {
  console.log(
    "Checking if all tables and policies exist in remote database...\n",
  );

  // List all tables
  console.log("1. Checking tables:");
  const tables = [
    "users",
    "projects",
    "project_volunteers",
    "outils",
    "materiel",
    "transport",
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`   ❌ ${table}: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`   ✅ ${table}: exists (using anon key)`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  console.log("\n2. Testing actual SELECT queries (like routes do):");

  // Test projects with full join
  console.log("\n   Testing projects endpoint query:");
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
      .order("created_at", { ascending: false });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`   ✅ Success - returned ${data.length} projects`);
      if (data.length > 0) {
        console.log(`   Sample:`, JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  // Test outils with full join
  console.log("\n   Testing outils endpoint query:");
  try {
    const { data, error } = await supabase
      .from("outils")
      .select(
        `
        *,
        users!outils_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`   ✅ Success - returned ${data.length} outils`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

checkTablesAndPolicies();
