require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Use ANON key to simulate server behavior
// const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMateriel() {
  console.log("Testing Materiel Fetch...");

  // Check users
  const { data: users } = await supabase.from("users").select("id");
  console.log(`Found ${users?.length} users.`);

  if (users?.length > 0) {
    const userId = users[0].id;
    // Try insert
    console.log("Inserting dummy material...");
    const { data: inserted, error: insertError } = await supabase
      .from("materiel")
      .insert({
        posted_by: userId,
        nom: "Test Material",
        location: "Gaza",
        photo: null,
      })
      .select();

    if (insertError) console.error("Insert error:", insertError);
    else console.log("Inserted:", inserted);
  } else {
    console.log("No users found to create material.");
  }

  // 1. Fetch all with Relation
  console.log("Fetching with relation...");
  const { data: relData, error: relError } = await supabase
    .from("materiel")
    .select(
      `
        *,
        users!materiel_posted_by_fkey (
          id,
          nom,
          email,
          numero,
          user_location:location
        )
      `,
    ); // Note: removed 'as user_location' which is post-processing or SQL alias which Supabase JS syntax might handle differently or same.
  // Actually 'location as user_location' in select string is valid in Supabase if column exists. "users!..." indicates the relationship.

  if (relError) {
    console.error("Error fetching materiel with relation:", relError);
  } else {
    console.log(`Fetched ${relData.length} materials with user info.`);
    if (relData.length > 0) console.log(relData[0].users);
  }
}

testMateriel();
