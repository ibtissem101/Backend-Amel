-- Migration: 004_create_outils_table.sql
-- Creates the outils (tools) table

CREATE TABLE outils (
  id SERIAL PRIMARY KEY,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo TEXT,
  location TEXT NOT NULL,
  duree_max INTEGER,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE outils IS 'Tools table storing available tools for projects';

-- Add comments to columns
COMMENT ON COLUMN outils.id IS 'Unique tool identifier (auto-increment)';
COMMENT ON COLUMN outils.posted_by IS 'Reference to the user who posted the tool';
COMMENT ON COLUMN outils.nom IS 'Tool name (required)';
COMMENT ON COLUMN outils.photo IS 'URL to tool photo';
COMMENT ON COLUMN outils.location IS 'Tool location (required)';
COMMENT ON COLUMN outils.duree_max IS 'Maximum duration for tool usage (in hours)';
COMMENT ON COLUMN outils.available IS 'Whether the tool is currently available';
COMMENT ON COLUMN outils.created_at IS 'Tool listing creation timestamp';

-- Create indexes
CREATE INDEX idx_outils_posted_by ON outils(posted_by);
CREATE INDEX idx_outils_location ON outils(location);
CREATE INDEX idx_outils_available ON outils(available);
CREATE INDEX idx_outils_created_at ON outils(created_at);
CREATE INDEX idx_outils_nom ON outils(nom);

-- Enable Row Level Security
ALTER TABLE outils ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view available tools" ON outils
  FOR SELECT USING (true);

CREATE POLICY "Users can create tool listings" ON outils
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Tool owners can update their tools" ON outils
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Tool owners can delete their tools" ON outils
  FOR DELETE USING (auth.uid() = posted_by);