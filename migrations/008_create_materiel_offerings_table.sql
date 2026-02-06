-- Migration: 008_create_materiel_offerings_table.sql
-- Creates the materiel_offerings table for material donations

CREATE TABLE materiel_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  materiel_id INTEGER NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE materiel_offerings IS 'Material offerings for projects';

-- Add comments to columns
COMMENT ON COLUMN materiel_offerings.id IS 'Unique identifier for the offering';
COMMENT ON COLUMN materiel_offerings.project_id IS 'Reference to the project';
COMMENT ON COLUMN materiel_offerings.materiel_id IS 'Reference to the offered material';
COMMENT ON COLUMN materiel_offerings.offered_by IS 'Reference to the user offering the material';
COMMENT ON COLUMN materiel_offerings.status IS 'Status of the material offering';
COMMENT ON COLUMN materiel_offerings.created_at IS 'Offering creation timestamp';

-- Create indexes
CREATE INDEX idx_materiel_offerings_project_id ON materiel_offerings(project_id);
CREATE INDEX idx_materiel_offerings_materiel_id ON materiel_offerings(materiel_id);
CREATE INDEX idx_materiel_offerings_offered_by ON materiel_offerings(offered_by);
CREATE INDEX idx_materiel_offerings_status ON materiel_offerings(status);
CREATE INDEX idx_materiel_offerings_created_at ON materiel_offerings(created_at);

-- Enable Row Level Security
ALTER TABLE materiel_offerings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view material offerings" ON materiel_offerings
  FOR SELECT USING (true);

CREATE POLICY "Material owners can offer their materials" ON materiel_offerings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materiel 
      WHERE materiel.id = materiel_offerings.materiel_id 
      AND materiel.posted_by = auth.uid()
    )
  );

CREATE POLICY "Material owners and project creators can update offerings" ON materiel_offerings
  FOR UPDATE USING (
    auth.uid() = offered_by OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = materiel_offerings.project_id 
      AND projects.creator_id = auth.uid()
    )
  );

CREATE POLICY "Material owners can delete their offerings" ON materiel_offerings
  FOR DELETE USING (auth.uid() = offered_by);