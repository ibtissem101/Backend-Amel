const { supabase } = require("./src/config/supabase");

async function testDatabase() {
  console.log("Testing database connection...\n");

  // Test projects table
  console.log("1. Testing projects table:");
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .limit(1);
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Details:`, error);
    } else {
      console.log(`   ✅ Success - Found ${data.length} records`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test outils table
  console.log("\n2. Testing outils table:");
  try {
    const { data, error } = await supabase.from("outils").select("*").limit(1);
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Details:`, error);
    } else {
      console.log(`   ✅ Success - Found ${data.length} records`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test materiel table
  console.log("\n3. Testing materiel table:");
  try {
    const { data, error } = await supabase
      .from("materiel")
      .select("*")
      .limit(1);
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Details:`, error);
    } else {
      console.log(`   ✅ Success - Found ${data.length} records`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test transport table
  console.log("\n4. Testing transport table:");
  try {
    const { data, error } = await supabase
      .from("transport")
      .select("*")
      .limit(1);
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Details:`, error);
    } else {
      console.log(`   ✅ Success - Found ${data.length} records`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  // Test users table
  console.log("\n5. Testing users table:");
  try {
    const { data, error } = await supabase.from("users").select("*").limit(1);
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Details:`, error);
    } else {
      console.log(`   ✅ Success - Found ${data.length} records`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }

  console.log("\nDatabase test completed.");
}

testDatabase();
