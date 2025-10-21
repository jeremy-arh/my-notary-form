-- Supabase Database Schema for Notary Service Request Form
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: notary
-- Stores notary information
CREATE TABLE IF NOT EXISTS notary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  license_number VARCHAR(100),
  specialization TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: services
-- Stores available notary services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(50),
  base_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: options
-- Stores additional service options
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  option_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  additional_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: submission
-- Stores form submissions
CREATE TABLE IF NOT EXISTS submission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Appointment Details
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  timezone VARCHAR(100) NOT NULL,

  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,

  -- Additional Information
  notes TEXT,

  -- Status and Assignment
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  assigned_notary_id UUID REFERENCES notary(id) ON DELETE SET NULL,

  -- Pricing
  total_price DECIMAL(10, 2),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table: submission_services
-- Junction table for submission and services (many-to-many)
CREATE TABLE IF NOT EXISTS submission_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, service_id)
);

-- Table: submission_options
-- Junction table for submission and options (many-to-many)
CREATE TABLE IF NOT EXISTS submission_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, option_id)
);

-- Table: submission_files
-- Stores uploaded files for each submission
CREATE TABLE IF NOT EXISTS submission_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submission_status ON submission(status);
CREATE INDEX IF NOT EXISTS idx_submission_email ON submission(email);
CREATE INDEX IF NOT EXISTS idx_submission_date ON submission(appointment_date);
CREATE INDEX IF NOT EXISTS idx_submission_created_at ON submission(created_at);
CREATE INDEX IF NOT EXISTS idx_submission_notary ON submission(assigned_notary_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_services_submission ON submission_services(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_options_submission ON submission_options(submission_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_notary_updated_at BEFORE UPDATE ON notary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_updated_at BEFORE UPDATE ON submission
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default services
INSERT INTO services (service_id, name, description, icon, color, base_price) VALUES
  ('real-estate', 'Real Estate Transaction', 'Purchase, sale, or refinancing of property', 'heroicons:home-modern', 'blue', 500.00),
  ('will', 'Last Will & Testament', 'Create or update your will', 'heroicons:document-text', 'purple', 250.00),
  ('power-of-attorney', 'Power of Attorney', 'Grant legal authority to another person', 'heroicons:scale', 'green', 200.00),
  ('marriage-contract', 'Marriage Contract', 'Prenuptial or marriage agreement', 'heroicons:heart', 'pink', 400.00),
  ('succession', 'Succession & Estate', 'Estate settlement and inheritance', 'heroicons:user-group', 'orange', 600.00),
  ('authentication', 'Document Authentication', 'Certify and authenticate documents', 'heroicons:shield-check', 'indigo', 150.00),
  ('affidavit', 'Affidavit', 'Sworn written statement', 'heroicons:pencil-square', 'cyan', 100.00),
  ('incorporation', 'Business Incorporation', 'Company formation and registration', 'heroicons:building-office', 'amber', 800.00)
ON CONFLICT (service_id) DO NOTHING;

-- Insert default options
INSERT INTO options (option_id, name, description, icon, additional_price) VALUES
  ('urgent', 'Urgent Service (48h)', 'Priority service within 48 hours', 'heroicons:bolt', 200.00),
  ('home-visit', 'Home Visit', 'Notary comes to your location', 'heroicons:home', 150.00),
  ('translation', 'Translation Service', 'Document translation services', 'heroicons:language', 100.00),
  ('consultation', 'Legal Consultation', 'Professional legal advice', 'heroicons:chat-bubble-left-right', 150.00)
ON CONFLICT (option_id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE notary ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to services and options
CREATE POLICY "Allow public read access to services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to options" ON options
  FOR SELECT USING (is_active = true);

-- Create policies for submission
CREATE POLICY "Allow public insert on submission" ON submission
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their own submissions" ON submission
  FOR SELECT USING (true); -- You may want to restrict this based on user email

-- Create policies for junction tables
CREATE POLICY "Allow public insert on submission_services" ON submission_services
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert on submission_options" ON submission_options
  FOR INSERT WITH CHECK (true);

-- Create policies for files
CREATE POLICY "Allow public insert on submission_files" ON submission_files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their submission files" ON submission_files
  FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE notary IS 'Stores information about notaries';
COMMENT ON TABLE services IS 'Available notary services catalog';
COMMENT ON TABLE options IS 'Additional service options';
COMMENT ON TABLE submission IS 'Form submissions from clients';
COMMENT ON TABLE submission_files IS 'Files uploaded with each submission';
COMMENT ON TABLE submission_services IS 'Services selected for each submission';
COMMENT ON TABLE submission_options IS 'Options selected for each submission';
