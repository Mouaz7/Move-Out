# Database Compatibility Guidelines

## Boolean Values

This project uses **dual database support**:

- **Production**: PostgreSQL (Supabase)
- **Development**: SQLite

### IMPORTANT: Boolean Handling

PostgreSQL uses `BOOLEAN` type and requires `TRUE`/`FALSE` literals.
SQLite uses `INTEGER` type and requires `1`/`0`.

**ALWAYS use `TRUE`/`FALSE` in SQL queries.**

The SQLite adapter in `config/db/sqlitePool.js` automatically converts:

- `TRUE` → `1`
- `FALSE` → `0`

### Examples

```javascript
// ✅ CORRECT - Works for both databases
await connection.query("UPDATE users SET is_active = TRUE WHERE user_id = ?", [
  userId,
]);
await connection.query("UPDATE users SET is_active = FALSE WHERE user_id = ?", [
  userId,
]);
await connection.query("SELECT * FROM users WHERE is_active = TRUE");

// ❌ WRONG - Only works for SQLite, breaks PostgreSQL
await connection.query("UPDATE users SET is_active = 1 WHERE user_id = ?", [
  userId,
]);
await connection.query("SELECT * FROM users WHERE is_active = 0");
```

### Boolean Columns

- `is_active`
- `is_verified`
- `is_admin`
- `is_private`

### Testing

Always test changes on **both** databases before pushing to production.
