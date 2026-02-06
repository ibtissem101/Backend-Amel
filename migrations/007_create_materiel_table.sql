-- Migration: 007_create_materiel_table.sql
-- Creates the materiel (materials) table

CREATE TABLE materiel (
  id SERIAL PRIMARY KEY,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo TEXT,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE materiel IS 'Materials table storing available materials for projects';

-- Add comments to columns
COMMENT ON COLUMN materiel.id IS 'Unique material identifier (auto-increment)';
COMMENT ON COLUMN materiel.posted_by IS 'Reference to the user who posted the material';
COMMENT ON COLUMN materiel.nom IS 'Material name (required)';
COMMENT ON COLUMN materiel.photo IS 'URL to material photo';
COMMENT ON COLUMN materiel.location IS 'Material location (required)';
COMMENT ON COLUMN materiel.created_at IS 'Material listing creation timestamp';

-- Create indexes
CREATE INDEX idx_materiel_posted_by ON materiel(posted_by);
CREATE INDEX idx_materiel_location ON materiel(location);
CREATE INDEX idx_materiel_created_at ON materiel(created_at);
CREATE INDEX idx_materiel_nom ON materiel(nom);

-- Enable Row Level Security
ALTER TABLE materiel ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view materials" ON materiel
  FOR SELECT USING (true);

CREATE POLICY "Users can create material listings" ON materiel
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Material owners can update their materials" ON materiel
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Material owners can delete their materials" ON materiel
  FOR DELETE USING (auth.uid() = posted_by);