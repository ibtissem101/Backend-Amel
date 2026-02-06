const { supabase } = require("./src/config/supabase");

async function testProjectsRouteLogic() {
  console.log("Testing exact projects route logic...\n");

  try {
    const { status } = {}; // empty query params

    let query = supabase
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

    // Filter by status if provided
    if (status) {
      if (!["open", "in_progress", "completed"].includes(status)) {
        console.log("Would return 400 - invalid status");
        return;
      }
      query = query.eq("status", status);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error("❌ Get projects error:", error);
      console.error("   Message:", error.message);
      console.error("   Code:", error.code);
      console.error("   Details:", error.details);
      return;
    }

    console.log(`✅ Query successful - got ${projects.length} projects`);
    console.log("   Raw data structure:");
    console.log(JSON.stringify(projects, null, 2));

    // Try to format exactly like the route does
    console.log("\n   Attempting to format like route...");
    try {
      const formattedProjects = projects.map((project) => {
        console.log(`   Processing project ${project.id}:`);
        console.log(`     - users:`, project.users);
        console.log(`     - project_volunteers:`, project.project_volunteers);

        return {
          id: project.id,
          location: project.location,
          min_person_req: project.min_person_req,
          needs_transportation: project.needs_transportation,
          has_kids: project.has_kids,
          has_elderly: project.has_elderly,
          has_shelter: project.has_shelter,
          priority: project.priority,
          status: project.status,
          created_at: project.created_at,
          creator: project.users,
          volunteer_count: project.project_volunteers[0]?.count || 0,
        };
      });

      console.log("\n✅ Formatting successful!");
      console.log("   Formatted data:");
      console.log(JSON.stringify(formattedProjects, null, 2));
    } catch (formatError) {
      console.error("\n❌ Formatting error:", formatError.message);
      console.error("   Stack:", formatError.stack);
    }
  } catch (error) {
    console.error("❌ Outer catch error:", error);
    console.error("   Stack:", error.stack);
  }
}

testProjectsRouteLogic();
