-- Migration: Add password reset functionality
-- Description: Lägg till kolumner för password reset tokens och expiry
-- Date: 2025-12-05

-- Lägg till kolumner för password reset
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL
AFTER verification_code_expires_at,
ADD COLUMN reset_token_expires_at DATETIME DEFAULT NULL
AFTER reset_token;

-- Lägg till index för snabbare queries på reset token
CREATE INDEX idx_reset_token ON users(reset_token);
CREATE INDEX idx_reset_expires ON users(reset_token_expires_at);

-- Kommentarer för dokumentation
ALTER TABLE users 
MODIFY COLUMN reset_token VARCHAR(255) 
COMMENT 'SHA256-hashad password reset token',
MODIFY COLUMN reset_token_expires_at DATETIME 
COMMENT 'Reset token utgångsdatum (30 minuter från skapande)';
