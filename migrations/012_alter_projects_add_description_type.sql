-- Migration: 012_alter_projects_add_description_type.sql
-- Adds description and type fields to projects table

-- Add description column
ALTER TABLE projects 
ADD COLUMN description TEXT;

-- Add type column with enum constraint
ALTER TABLE projects 
ADD COLUMN type TEXT DEFAULT 'community' 
CHECK (type IN ('community', 'personal'));

-- Add comments to new columns
COMMENT ON COLUMN projects.description IS 'Project description (optional)';
COMMENT ON COLUMN projects.type IS 'Project type: community or personal';

-- Create index on type for filtering
CREATE INDEX idx_projects_type ON projects(type);
