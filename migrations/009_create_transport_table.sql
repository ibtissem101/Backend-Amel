-- Migration: 009_create_transport_table.sql
-- Creates the transport table

CREATE TABLE transport (
  id SERIAL PRIMARY KEY,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  numero TEXT,
  photo TEXT,
  location TEXT NOT NULL,
  duree_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE transport IS 'Transport table storing available transportation for projects';

-- Add comments to columns
COMMENT ON COLUMN transport.id IS 'Unique transport identifier (auto-increment)';
COMMENT ON COLUMN transport.posted_by IS 'Reference to the user who posted the transport';
COMMENT ON COLUMN transport.nom IS 'Transport name/description (required)';
COMMENT ON COLUMN transport.numero IS 'Contact number for transport';
COMMENT ON COLUMN transport.photo IS 'URL to transport photo';
COMMENT ON COLUMN transport.location IS 'Transport location (required)';
COMMENT ON COLUMN transport.duree_max IS 'Maximum duration for transport usage (in hours)';
COMMENT ON COLUMN transport.created_at IS 'Transport listing creation timestamp';

-- Create indexes
CREATE INDEX idx_transport_posted_by ON transport(posted_by);
CREATE INDEX idx_transport_location ON transport(location);
CREATE INDEX idx_transport_created_at ON transport(created_at);
CREATE INDEX idx_transport_nom ON transport(nom);

-- Enable Row Level Security
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view transport" ON transport
  FOR SELECT USING (true);

CREATE POLICY "Users can create transport listings" ON transport
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Transport owners can update their transport" ON transport
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Transport owners can delete their transport" ON transport
  FOR DELETE USING (auth.uid() = posted_by);