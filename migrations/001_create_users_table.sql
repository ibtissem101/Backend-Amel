-- Migration: 001_create_users_table.sql
-- Creates the users table with all required fields and constraints

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nom TEXT,
  photo TEXT,
  numero TEXT,
  location TEXT,
  available_days JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE users IS 'Users table storing user profile information';

-- Add comments to columns
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.nom IS 'User full name';
COMMENT ON COLUMN users.photo IS 'URL to user profile photo';
COMMENT ON COLUMN users.numero IS 'User phone number';
COMMENT ON COLUMN users.location IS 'User location/address';
COMMENT ON COLUMN users.available_days IS 'Array of days user is available (JSON)';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);