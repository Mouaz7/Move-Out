-- Migration: Add verification code expiry
-- Description: Lägg till utgångsdatum för verification codes (24 timmar)
-- Date: 2025-12-05

-- Lägg till kolumn för verification code expiry
ALTER TABLE users 
ADD COLUMN verification_code_expires_at DATETIME DEFAULT NULL
AFTER verification_code;

-- Uppdatera befintliga verification codes att utgå om 24 timmar från nu
-- (Endast för codes som inte är NULL och användare som inte är verifierade)
UPDATE users 
SET verification_code_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
WHERE verification_code IS NOT NULL 
AND is_verified = FALSE;

-- Lägg till index för snabbare queries
CREATE INDEX idx_verification_expires ON users(verification_code_expires_at);

-- Kommentar på kolumnen för dokumentation
ALTER TABLE users 
MODIFY COLUMN verification_code_expires_at DATETIME 
COMMENT 'Verification code utgångsdatum (24 timmar från skapande)';
