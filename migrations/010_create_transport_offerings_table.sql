-- Migration: 010_create_transport_offerings_table.sql
-- Creates the transport_offerings table for transport services

CREATE TABLE transport_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  transport_id INTEGER NOT NULL REFERENCES transport(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE transport_offerings IS 'Transport offerings for projects';

-- Add comments to columns
COMMENT ON COLUMN transport_offerings.id IS 'Unique identifier for the offering';
COMMENT ON COLUMN transport_offerings.project_id IS 'Reference to the project';
COMMENT ON COLUMN transport_offerings.transport_id IS 'Reference to the offered transport';
COMMENT ON COLUMN transport_offerings.offered_by IS 'Reference to the user offering the transport';
COMMENT ON COLUMN transport_offerings.status IS 'Status of the transport offering';
COMMENT ON COLUMN transport_offerings.created_at IS 'Offering creation timestamp';

-- Create indexes
CREATE INDEX idx_transport_offerings_project_id ON transport_offerings(project_id);
CREATE INDEX idx_transport_offerings_transport_id ON transport_offerings(transport_id);
CREATE INDEX idx_transport_offerings_offered_by ON transport_offerings(offered_by);
CREATE INDEX idx_transport_offerings_status ON transport_offerings(status);
CREATE INDEX idx_transport_offerings_created_at ON transport_offerings(created_at);

-- Enable Row Level Security
ALTER TABLE transport_offerings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view transport offerings" ON transport_offerings
  FOR SELECT USING (true);

CREATE POLICY "Transport owners can offer their transport" ON transport_offerings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transport 
      WHERE transport.id = transport_offerings.transport_id 
      AND transport.posted_by = auth.uid()
    )
  );

CREATE POLICY "Transport owners and project creators can update offerings" ON transport_offerings
  FOR UPDATE USING (
    auth.uid() = offered_by OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = transport_offerings.project_id 
      AND projects.creator_id = auth.uid()
    )
  );

CREATE POLICY "Transport owners can delete their offerings" ON transport_offerings
  FOR DELETE USING (auth.uid() = offered_by);