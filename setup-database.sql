-- Complete Database Setup Script for Backend Gaza
-- Run this script in your Supabase SQL Editor to create all tables

-- ============================================
-- 1. Create users table
-- ============================================
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location);

-- ============================================
-- 2. Create projects table
-- ============================================
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  materials_needed TEXT,
  estimated_duration INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_location ON projects(location);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- ============================================
-- 3. Create project_volunteers table
-- ============================================
CREATE TABLE project_volunteers (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_volunteers_project_id ON project_volunteers(project_id);
CREATE INDEX idx_project_volunteers_user_id ON project_volunteers(user_id);

-- ============================================
-- 4. Create outils table
-- ============================================
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

CREATE INDEX idx_outils_posted_by ON outils(posted_by);
CREATE INDEX idx_outils_location ON outils(location);
CREATE INDEX idx_outils_available ON outils(available);

-- ============================================
-- 5. Create project_outil_requests table
-- ============================================
CREATE TABLE project_outil_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outil_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_outil_requests_project_id ON project_outil_requests(project_id);
CREATE INDEX idx_project_outil_requests_requested_by ON project_outil_requests(requested_by);
CREATE INDEX idx_project_outil_requests_status ON project_outil_requests(status);

-- ============================================
-- 6. Create outil_offerings table
-- ============================================
CREATE TABLE outil_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outil_id INTEGER NOT NULL REFERENCES outils(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, outil_id, offered_by)
);

CREATE INDEX idx_outil_offerings_project_id ON outil_offerings(project_id);
CREATE INDEX idx_outil_offerings_outil_id ON outil_offerings(outil_id);
CREATE INDEX idx_outil_offerings_offered_by ON outil_offerings(offered_by);
CREATE INDEX idx_outil_offerings_status ON outil_offerings(status);

-- ============================================
-- 7. Create materiel table
-- ============================================
CREATE TABLE materiel (
  id SERIAL PRIMARY KEY,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo TEXT,
  location TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_materiel_posted_by ON materiel(posted_by);
CREATE INDEX idx_materiel_location ON materiel(location);
CREATE INDEX idx_materiel_available ON materiel(available);

-- ============================================
-- 8. Create materiel_offerings table
-- ============================================
CREATE TABLE materiel_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  materiel_id INTEGER NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, materiel_id, offered_by)
);

CREATE INDEX idx_materiel_offerings_project_id ON materiel_offerings(project_id);
CREATE INDEX idx_materiel_offerings_materiel_id ON materiel_offerings(materiel_id);
CREATE INDEX idx_materiel_offerings_offered_by ON materiel_offerings(offered_by);
CREATE INDEX idx_materiel_offerings_status ON materiel_offerings(status);

-- ============================================
-- 9. Create transport table
-- ============================================
CREATE TABLE transport (
  id SERIAL PRIMARY KEY,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo TEXT,
  location TEXT NOT NULL,
  numero TEXT,
  duree_max INTEGER,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transport_posted_by ON transport(posted_by);
CREATE INDEX idx_transport_location ON transport(location);
CREATE INDEX idx_transport_available ON transport(available);

-- ============================================
-- 10. Create transport_offerings table
-- ============================================
CREATE TABLE transport_offerings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  transport_id INTEGER NOT NULL REFERENCES transport(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, transport_id, offered_by)
);

CREATE INDEX idx_transport_offerings_project_id ON transport_offerings(project_id);
CREATE INDEX idx_transport_offerings_transport_id ON transport_offerings(transport_id);
CREATE INDEX idx_transport_offerings_offered_by ON transport_offerings(offered_by);
CREATE INDEX idx_transport_offerings_status ON transport_offerings(status);

-- ============================================
-- 11. Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outils ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_outil_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE outil_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiel ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiel_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_offerings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. Create RLS Policies
-- ============================================

-- Users policies
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies  
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Project creators can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Project creators can delete their projects" ON projects
  FOR DELETE USING (auth.uid() = creator_id);

-- Project volunteers policies
CREATE POLICY "Anyone can view project volunteers" ON project_volunteers
  FOR SELECT USING (true);

CREATE POLICY "Users can volunteer for projects" ON project_volunteers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from projects" ON project_volunteers
  FOR DELETE USING (auth.uid() = user_id);

-- Outils policies
CREATE POLICY "Anyone can view outils" ON outils
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create outils" ON outils
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Outil owners can update their outils" ON outils
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Outil owners can delete their outils" ON outils
  FOR DELETE USING (auth.uid() = posted_by);

-- Similar policies for materiel and transport
CREATE POLICY "Anyone can view materiel" ON materiel
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create materiel" ON materiel
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Materiel owners can update their materiel" ON materiel
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Materiel owners can delete their materiel" ON materiel
  FOR DELETE USING (auth.uid() = posted_by);

CREATE POLICY "Anyone can view transport" ON transport
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create transport" ON transport
  FOR INSERT WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Transport owners can update their transport" ON transport
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Transport owners can delete their transport" ON transport
  FOR DELETE USING (auth.uid() = posted_by);

-- Offering policies (simplified - anyone can view, authenticated users can create)
CREATE POLICY "Anyone can view outil offerings" ON outil_offerings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create outil offerings" ON outil_offerings
  FOR INSERT WITH CHECK (auth.uid() = offered_by);

CREATE POLICY "Anyone can view materiel offerings" ON materiel_offerings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create materiel offerings" ON materiel_offerings
  FOR INSERT WITH CHECK (auth.uid() = offered_by);

CREATE POLICY "Anyone can view transport offerings" ON transport_offerings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create transport offerings" ON transport_offerings
  FOR INSERT WITH CHECK (auth.uid() = offered_by);

-- ============================================
-- 13. Create functions for updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_outil_requests_updated_at
    BEFORE UPDATE ON project_outil_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outil_offerings_updated_at
    BEFORE UPDATE ON outil_offerings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materiel_offerings_updated_at
    BEFORE UPDATE ON materiel_offerings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_offerings_updated_at
    BEFORE UPDATE ON transport_offerings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Setup Complete!
-- ============================================

-- Insert a test user to verify everything works
INSERT INTO users (email, nom, location) VALUES 
('admin@example.com', 'Admin User', 'Admin Location');