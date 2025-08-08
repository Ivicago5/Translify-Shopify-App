-- =============================================================================
-- TRANSLIFY - POSTGRESQL INITIALIZATION SCRIPT
-- This script runs when the PostgreSQL container starts
-- =============================================================================

-- Grant all privileges to translify_user
GRANT ALL PRIVILEGES ON DATABASE translify TO translify_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO translify_user;
GRANT CREATE ON SCHEMA public TO translify_user;

-- Connect to the translify database
\c translify;

-- Grant all privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO translify_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO translify_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO translify_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO translify_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO translify_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO translify_user;

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions on migrations table
GRANT ALL PRIVILEGES ON TABLE migrations TO translify_user;
GRANT USAGE, SELECT ON SEQUENCE migrations_id_seq TO translify_user; 