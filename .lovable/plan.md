
The user wants ready-to-use login credentials for every role in Credify (ITI Admin, Principal, Trainer). Since signups are gated by the `whitelist` table, I need to: (1) seed whitelist entries for fresh accounts, (2) create the auth users with known passwords, and (3) hand the user a clean credentials sheet.

Auto-confirm email is required so the accounts can sign in immediately without email verification.

## Plan: Seed full login credentials for all roles

### 1. Ensure an institution exists
Reuse "ITI Mumbai" if present, otherwise insert it. Capture its `institution_id` for Principal + Trainer whitelist rows.

### 2. Add whitelist entries (idempotent)
Insert into `public.whitelist` (skipping if email already exists):

| Email | Role | Institution |
|---|---|---|
| admin@credify.in | iti_admin | — |
| principal@credify.in | principal | ITI Mumbai |
| trainer@credify.in | trainer | ITI Mumbai |

### 3. Create the auth users with known passwords
Use a small Node script via the Supabase Admin API (`SUPABASE_SERVICE_ROLE_KEY`) to call `auth.admin.createUser` with `email_confirm: true` for each account. The existing `handle_new_user` trigger will automatically:
- read the whitelist row
- create the `profiles` record with the correct role + institution
- create the `user_roles` record
- mark the whitelist entry as used

Password for all three (demo-friendly, easy to type): **`Credify@2026`**

### 4. Deliver credentials to the user

```
ITI Admin
  Email:    admin@credify.in
  Password: Credify@2026

Principal (ITI Mumbai)
  Email:    principal@credify.in
  Password: Credify@2026

Trainer (ITI Mumbai)
  Email:    trainer@credify.in
  Password: Credify@2026
```

Login URL: `/auth` → Sign in tab. After login, users are auto-routed to their role dashboard (`/admin`, `/principal`, `/trainer`).

### Notes
- No schema changes — only data inserts + auth user creation.
- Existing seeded accounts from v1 (`admin@credify.gov.in`, etc.) are left untouched.
- If you'd prefer different emails or a stronger password, tell me before approval and I'll adjust.
