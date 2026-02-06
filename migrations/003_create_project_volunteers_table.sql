-- Migration: 003_create_project_volunteers_table.sql
-- Creates the project_volunteers junction table for project-volunteer relationships

CREATE TABLE project_volunteers (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, volunteer_id)
);

-- Add comment to table
COMMENT ON TABLE project_volunteers IS 'Junction table for project-volunteer relationships';

-- Add comments to columns
COMMENT ON COLUMN project_volunteers.id IS 'Unique identifier for the relationship';
COMMENT ON COLUMN project_volunteers.project_id IS 'Reference to the project';
COMMENT ON COLUMN project_volunteers.volunteer_id IS 'Reference to the volunteer user';
COMMENT ON COLUMN project_volunteers.joined_at IS 'When the volunteer joined the project';

-- Create indexes
CREATE INDEX idx_project_volunteers_project_id ON project_volunteers(project_id);
CREATE INDEX idx_project_volunteers_volunteer_id ON project_volunteers(volunteer_id);
CREATE INDEX idx_project_volunteers_joined_at ON project_volunteers(joined_at);

-- Enable Row Level Security
ALTER TABLE project_volunteers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view project volunteers" ON project_volunteers
  FOR SELECT USING (true);

CREATE POLICY "Users can join projects as volunteers" ON project_volunteers
  FOR INSERT WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can leave projects" ON project_volunteers
  FOR DELETE USING (auth.uid() = volunteer_id);

CREATE POLICY "Project creators can manage volunteers" ON project_volunteers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_volunteers.project_id 
      AND projects.creator_id = auth.uid()
    )
  );