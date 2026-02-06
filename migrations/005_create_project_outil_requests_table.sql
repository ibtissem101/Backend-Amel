-- Migration: 005_create_project_outil_requests_table.sql
-- Creates the project_outil_requests junction table for project tool requests

CREATE TABLE project_outil_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outil_id INTEGER NOT NULL REFERENCES outils(id) ON DELETE CASCADE,
  UNIQUE(project_id, outil_id)
);

-- Add comment to table
COMMENT ON TABLE project_outil_requests IS 'Junction table for project tool requests';

-- Add comments to columns
COMMENT ON COLUMN project_outil_requests.id IS 'Unique identifier for the request';
COMMENT ON COLUMN project_outil_requests.project_id IS 'Reference to the project';
COMMENT ON COLUMN project_outil_requests.outil_id IS 'Reference to the requested tool';

-- Create indexes
CREATE INDEX idx_project_outil_requests_project_id ON project_outil_requests(project_id);
CREATE INDEX idx_project_outil_requests_outil_id ON project_outil_requests(outil_id);

-- Enable Row Level Security
ALTER TABLE project_outil_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tool requests" ON project_outil_requests
  FOR SELECT USING (true);

CREATE POLICY "Project creators can request tools" ON project_outil_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_outil_requests.project_id 
      AND projects.creator_id = auth.uid()
    )
  );

CREATE POLICY "Project creators can manage tool requests" ON project_outil_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_outil_requests.project_id 
      AND projects.creator_id = auth.uid()
    )
  );