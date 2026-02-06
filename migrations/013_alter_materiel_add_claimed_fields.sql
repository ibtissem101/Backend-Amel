-- Migration: 013_alter_materiel_add_claimed_fields.sql
-- Adds claimed fields to materiel table to track when materials are claimed by projects

-- Add claimed_by_project_id column
ALTER TABLE materiel 
ADD COLUMN claimed_by_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_claimed BOOLEAN DEFAULT false;

-- Add comments to new columns
COMMENT ON COLUMN materiel.claimed_by_project_id IS 'Reference to the project that claimed this material';
COMMENT ON COLUMN materiel.claimed_at IS 'Timestamp when material was claimed';
COMMENT ON COLUMN materiel.is_claimed IS 'Whether the material has been claimed';

-- Create index on claimed fields for efficient querying
CREATE INDEX idx_materiel_claimed_by_project_id ON materiel(claimed_by_project_id);
CREATE INDEX idx_materiel_is_claimed ON materiel(is_claimed);

-- Update RLS policy to allow project creators to claim materials
CREATE POLICY "Project creators can claim materials" ON materiel
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = materiel.claimed_by_project_id 
      AND projects.creator_id = auth.uid()
    )
  );
