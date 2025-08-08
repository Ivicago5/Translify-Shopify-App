#!/bin/bash

echo "🗄️ Setting up PostgreSQL for Translify..."

# Create database and user with proper permissions
sudo -u postgres psql << EOF
-- Drop existing user and database if they exist
DROP DATABASE IF EXISTS translify;
DROP USER IF EXISTS translify_user;

-- Create user with proper permissions
CREATE USER translify_user WITH PASSWORD 'jebessise01';

-- Create database
CREATE DATABASE translify OWNER translify_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE translify TO translify_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO translify_user;
GRANT CREATE ON SCHEMA public TO translify_user;

-- Connect to the database and grant table permissions
\c translify
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO translify_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO translify_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO translify_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO translify_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO translify_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO translify_user;

EOF

echo "✅ PostgreSQL setup completed!"
echo "🔗 Connection string: postgresql://translify_user:jebessise01@localhost:5432/translify" 