-- Migration: 002_create_projects_table.sql
-- Creates the projects table with priority generated column and status constraints

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  min_person_req INTEGER NOT NULL,
  needs_transportation BOOLEAN DEFAULT false,
  has_kids BOOLEAN DEFAULT false,
  has_elderly BOOLEAN DEFAULT false,
  has_shelter BOOLEAN DEFAULT true,
  priority BOOLEAN GENERATED ALWAYS AS (NOT has_shelter OR has_kids OR has_elderly) STORED,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE projects IS 'Projects table storing community project information';

-- Add comments to columns
COMMENT ON COLUMN projects.id IS 'Unique project identifier (auto-increment)';
COMMENT ON COLUMN projects.creator_id IS 'Reference to the user who created the project';
COMMENT ON COLUMN projects.location IS 'Project location (required)';
COMMENT ON COLUMN projects.min_person_req IS 'Minimum number of people required for the project';
COMMENT ON COLUMN projects.needs_transportation IS 'Whether the project needs transportation';
COMMENT ON COLUMN projects.has_kids IS 'Whether the project involves children';
COMMENT ON COLUMN projects.has_elderly IS 'Whether the project involves elderly people';
COMMENT ON COLUMN projects.has_shelter IS 'Whether the location has shelter';
COMMENT ON COLUMN projects.priority IS 'Auto-calculated priority based on conditions';
COMMENT ON COLUMN projects.status IS 'Current status of the project';
COMMENT ON COLUMN projects.created_at IS 'Project creation timestamp';

-- Create indexes
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_location ON projects(location);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_needs_transportation ON projects(needs_transportation);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Project creators can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Project creators can delete their projects" ON projects
  FOR DELETE USING (auth.uid() = creator_id);