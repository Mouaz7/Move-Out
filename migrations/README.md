# Database Migrations

Detta directory innehåller SQL-migrationer för Move-Out applikationen.

## Tillgängliga Migrations

### 001_add_verification_expiry.sql

Lägger till `verification_code_expires_at` kolumn för email verification codes.

- **Utgångsdatum**: 24 timmar från skapande
- **Status**: ⚠️ Måste köras

### 002_add_password_reset.sql

Lägger till kolumner för password reset funktionalitet.

- **Kolumner**: `reset_token`, `reset_token_expires_at`
- **Status**: 🔜 Valfri (krävs endast om password reset implementeras)

## Hur man kör migrations

### Alternativ 1: MySQL Command Line

```bash
# Navigera till migrations directory
cd migrations

# Kör migration 001
mysql -u [username] -p [database_name] < 001_add_verification_expiry.sql

# Kör migration 002 (valfritt)
mysql -u [username] -p [database_name] < 002_add_password_reset.sql
```

### Alternativ 2: MySQL Workbench / phpMyAdmin

1. Öppna filen i din databas-klient
2. Kör SQL-kommandona manuellt

## Backup innan migration

⚠️ **VIKTIGT**: Ta alltid backup av databasen innan du kör migrations!

```bash
# Ta backup
mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d).sql
```

## Verifiering efter migration

Kör följande queries för att verifiera att kolumnerna är tillagda:

```sql
-- Verifiera verification_code_expires_at
DESCRIBE users;
SHOW COLUMNS FROM users LIKE 'verification_code_expires_at';

-- Verifiera reset_token kolumner (om 002 kördes)
SHOW COLUMNS FROM users LIKE 'reset_token%';
```

## Rollback

Om du behöver ångra migration 001:

```sql
ALTER TABLE users
DROP COLUMN verification_code_expires_at,
DROP INDEX idx_verification_expires;
```

Om du behöver ångra migration 002:

```sql
ALTER TABLE users
DROP COLUMN reset_token,
DROP COLUMN reset_token_expires_at,
DROP INDEX idx_reset_token,
DROP INDEX idx_reset_expires;
```

## Status och Nästa Steg

- ✅ Migration 001 är **kritisk** för att verification expiry ska fungera
- 🔜 Migration 002 behövs endast om password reset implementeras i framtiden
- 📝 Befintliga verification codes uppdateras automatiskt med 24h expiry

## Support

Vid problem, kontakta systemadministratören eller kör rollback-kommandona ovan.
