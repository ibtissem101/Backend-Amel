-- Migration: 011_create_indexes_and_final_setup.sql
-- Creates additional indexes for performance optimization and final setup

-- Additional composite indexes for performance
CREATE INDEX idx_projects_status_priority ON projects(status, priority);
CREATE INDEX idx_projects_location_status ON projects(location, status);
CREATE INDEX idx_outils_location_available ON outils(location, available);

-- Indexes for offerings tables to improve query performance
CREATE INDEX idx_outil_offerings_project_status ON outil_offerings(project_id, status);
CREATE INDEX idx_materiel_offerings_project_status ON materiel_offerings(project_id, status);
CREATE INDEX idx_transport_offerings_project_status ON transport_offerings(project_id, status);

-- Partial indexes for active/available items
CREATE INDEX idx_outils_available_true ON outils(location, created_at) WHERE available = true;
CREATE INDEX idx_projects_open ON projects(location, created_at) WHERE status = 'open';
CREATE INDEX idx_projects_priority_open ON projects(priority, created_at) WHERE status = 'open' AND priority = true;

-- Function to automatically update available status when tool is offered and accepted
CREATE OR REPLACE FUNCTION update_outil_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE outils SET available = false WHERE id = NEW.outil_id;
  ELSIF NEW.status = 'returned' AND OLD.status = 'accepted' THEN
    UPDATE outils SET available = true WHERE id = NEW.outil_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for outil availability
CREATE TRIGGER trigger_update_outil_availability
  AFTER UPDATE OF status ON outil_offerings
  FOR EACH ROW
  EXECUTE FUNCTION update_outil_availability();

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(project_id_param INTEGER)
RETURNS TABLE(
  volunteer_count INTEGER,
  outil_requests_count INTEGER,
  outil_offers_count INTEGER,
  materiel_offers_count INTEGER,
  transport_offers_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM project_volunteers WHERE project_id = project_id_param),
    (SELECT COUNT(*)::INTEGER FROM project_outil_requests WHERE project_id = project_id_param),
    (SELECT COUNT(*)::INTEGER FROM outil_offerings WHERE project_id = project_id_param),
    (SELECT COUNT(*)::INTEGER FROM materiel_offerings WHERE project_id = project_id_param),
    (SELECT COUNT(*)::INTEGER FROM transport_offerings WHERE project_id = project_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create view for project summary with statistics
CREATE VIEW project_summary AS
SELECT 
  p.*,
  u.nom as creator_name,
  u.email as creator_email,
  (SELECT COUNT(*) FROM project_volunteers pv WHERE pv.project_id = p.id) as volunteer_count,
  (SELECT COUNT(*) FROM project_outil_requests por WHERE por.project_id = p.id) as tool_requests_count,
  (SELECT COUNT(*) FROM outil_offerings oo WHERE oo.project_id = p.id AND oo.status = 'accepted') as accepted_tools_count,
  (SELECT COUNT(*) FROM materiel_offerings mo WHERE mo.project_id = p.id AND mo.status = 'accepted') as accepted_materials_count,
  (SELECT COUNT(*) FROM transport_offerings tro WHERE tro.project_id = p.id AND tro.status = 'accepted') as accepted_transport_count
FROM projects p
JOIN users u ON p.creator_id = u.id;

-- Enable RLS on the view
ALTER VIEW project_summary ENABLE ROW LEVEL SECURITY;

-- Create policy for the view
CREATE POLICY "Anyone can view project summary" ON project_summary
  FOR SELECT USING (true);

-- Grant necessary permissions
GRANT SELECT ON project_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_stats TO authenticated;