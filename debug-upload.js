const { supabase, supabaseAdmin } = require("./src/config/supabase");
const fs = require("fs");
const path = require("path");

async function testUpload() {
  console.log("Starting upload test...");
  
  // Create a dummy file
  const start = Date.now();
  const testDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
  }
  const filePath = path.join(testDir, "test-image.txt");
  fs.writeFileSync(filePath, "This is a test image content " + start);
  
  const fileName = `test-${start}.txt`;
  
  try {
      console.log("Reading file...");
      const fileBuffer = fs.readFileSync(filePath);
      
      console.log(`Uploading to bucket 'materiel-photos' using ANON client...`);
      const { data, error } = await supabase.storage
        .from("materiel-photos")
        .upload(fileName, fileBuffer, {
          contentType: "text/plain",
          upsert: false,
        });
        
      if (error) {
          console.error("❌ ANON Upload failed:", error.message);
          console.error("Full error:", JSON.stringify(error, null, 2));
          
          // Try with Admin
          console.log(`Trying again with SERVICE/ADMIN client...`);
          const { data: adminData, error: adminError } = await supabaseAdmin.storage
            .from("materiel-photos")
            .upload("admin-" + fileName, fileBuffer, {
              contentType: "text/plain",
              upsert: false,
            });
            
          if (adminError) {
              console.error("❌ ADMIN Upload failed:", adminError.message);
          } else {
              console.log("✅ ADMIN Upload success!");
          }
          
      } else {
          console.log("✅ ANON Upload success!");
      }
      
  } catch (e) {
      console.error("Exception:", e);
  } finally {
      // Cleanup
      if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

testUpload();
