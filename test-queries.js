const { supabase } = require("./src/config/supabase");

async function testQueries() {
  console.log("Testing queries with joins...\n");

  // Test projects query with join
  console.log("1. Testing projects with user join:");
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
      .limit(1);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details:`, error.details);
      console.error(`   Hint:`, error.hint);
    } else {
      console.log(`   ✅ Success - Query works`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test outils query with join
  console.log("\n2. Testing outils with user join:");
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
      .limit(1);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details:`, error.details);
      console.error(`   Hint:`, error.hint);
    } else {
      console.log(`   ✅ Success - Query works`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test materiel query with join
  console.log("\n3. Testing materiel with user join:");
  try {
    const { data, error } = await supabase
      .from("materiel")
      .select(
        `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location
        )
      `,
      )
      .limit(1);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details:`, error.details);
      console.error(`   Hint:`, error.hint);
    } else {
      console.log(`   ✅ Success - Query works`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test transport query with join
  console.log("\n4. Testing transport with user join:");
  try {
    const { data, error } = await supabase
      .from("transport")
      .select(
        `
        *,
        users!transport_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          location
        )
      `,
      )
      .limit(1);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details:`, error.details);
      console.error(`   Hint:`, error.hint);
    } else {
      console.log(`   ✅ Success - Query works`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  console.log("\nQuery test completed.");
}

testQueries();
