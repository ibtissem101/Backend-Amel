-- Migration: 006_create_outil_offerings_table.sql
-- Creates the outil_offerings table for tool lending

CREATE TABLE outil_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outil_id INTEGER NOT NULL REFERENCES outils(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE outil_offerings IS 'Tool offerings for projects';

-- Add comments to columns
COMMENT ON COLUMN outil_offerings.id IS 'Unique identifier for the offering';
COMMENT ON COLUMN outil_offerings.project_id IS 'Reference to the project';
COMMENT ON COLUMN outil_offerings.outil_id IS 'Reference to the offered tool';
COMMENT ON COLUMN outil_offerings.offered_by IS 'Reference to the user offering the tool';
COMMENT ON COLUMN outil_offerings.status IS 'Status of the tool offering';
COMMENT ON COLUMN outil_offerings.created_at IS 'Offering creation timestamp';

-- Create indexes
CREATE INDEX idx_outil_offerings_project_id ON outil_offerings(project_id);
CREATE INDEX idx_outil_offerings_outil_id ON outil_offerings(outil_id);
CREATE INDEX idx_outil_offerings_offered_by ON outil_offerings(offered_by);
CREATE INDEX idx_outil_offerings_status ON outil_offerings(status);
CREATE INDEX idx_outil_offerings_created_at ON outil_offerings(created_at);

-- Enable Row Level Security
ALTER TABLE outil_offerings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tool offerings" ON outil_offerings
  FOR SELECT USING (true);

CREATE POLICY "Tool owners can offer their tools" ON outil_offerings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM outils 
      WHERE outils.id = outil_offerings.outil_id 
      AND outils.posted_by = auth.uid()
    )
  );

CREATE POLICY "Tool owners and project creators can update offerings" ON outil_offerings
  FOR UPDATE USING (
    auth.uid() = offered_by OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = outil_offerings.project_id 
      AND projects.creator_id = auth.uid()
    )
  );

CREATE POLICY "Tool owners can delete their offerings" ON outil_offerings
  FOR DELETE USING (auth.uid() = offered_by);