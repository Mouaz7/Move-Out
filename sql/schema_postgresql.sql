-- PostgreSQL Schema for MoveOut
-- Run this in your Render PostgreSQL database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    profile_name VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    storage_usage INT DEFAULT 0,
    verification_token VARCHAR(255),
    verification_code VARCHAR(6),
    verification_code_expires_at TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create boxes table
CREATE TABLE IF NOT EXISTS boxes (
    box_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    box_name VARCHAR(255),
    label_name VARCHAR(255),
    label_image VARCHAR(255),
    content_type VARCHAR(20) CHECK (content_type IN ('text', 'image', 'audio')),
    content_data TEXT,
    qr_code TEXT UNIQUE,
    access_token VARCHAR(32) UNIQUE NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    pin_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create qr_code table
CREATE TABLE IF NOT EXISTS qr_code (
    qr_id SERIAL PRIMARY KEY,
    box_id INT NOT NULL REFERENCES boxes(box_id) ON DELETE CASCADE,
    qr_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create box_contents table
CREATE TABLE IF NOT EXISTS box_contents (
    content_id SERIAL PRIMARY KEY,
    box_id INT NOT NULL REFERENCES boxes(box_id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'audio', 'image')),
    content_data TEXT,
    content_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
    label_id SERIAL PRIMARY KEY,
    label_name VARCHAR(255) NOT NULL,
    label_design VARCHAR(50),
    is_private BOOLEAN DEFAULT FALSE,
    pin_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create box_labels table
CREATE TABLE IF NOT EXISTS box_labels (
    box_label_id SERIAL PRIMARY KEY,
    box_id INT NOT NULL REFERENCES boxes(box_id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(label_id) ON DELETE CASCADE
);

-- Create label_contents table
CREATE TABLE IF NOT EXISTS label_contents (
    content_id SERIAL PRIMARY KEY,
    label_id INT NOT NULL REFERENCES labels(label_id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'audio', 'image')),
    content_text TEXT,
    content_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create security table
CREATE TABLE IF NOT EXISTS security (
    security_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    security_name VARCHAR(255),
    date_of_creation DATE,
    date_of_destruction DATE
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shared_labels table
CREATE TABLE IF NOT EXISTS shared_labels (
    share_id SERIAL PRIMARY KEY,
    label_id INT NOT NULL REFERENCES labels(label_id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Insert admin user (password: Admin123!)
INSERT INTO users (email, password_hash, profile_name, is_verified, is_active, is_admin)
VALUES (
    'admin@moveout.com',
    '$2a$10$3tBc/x9SqExfaf50ltT0Uu0EqPePiW4.bykTf80ai5I53hjiQ/TXG',
    'Admin User',
    TRUE,
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;
