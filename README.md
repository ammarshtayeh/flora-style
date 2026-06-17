# Flora Style

Luxury-clean Next.js storefront and admin panel backed by Supabase.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local`.
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Start the app:
   ```bash
   npm run dev
   ```

## Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase_schema.sql` once.
   - The script is idempotent enough to be re-run for setup fixes and seed refreshes.
   - It now also handles legacy `admins` rows more safely by attaching `user_id` on first bootstrap when possible.
3. Open `/admin/login`.
4. Use the `إنشاء / إكمال أول أدمن` tab.
   - If email confirmation is disabled, the first admin is created immediately.
   - If email confirmation is enabled, create the account, confirm the email, sign in, then return to the same tab to complete the first-admin link.
5. If you want to create additional admin accounts from the dashboard itself, add `SUPABASE_SERVICE_ROLE_KEY` to your server environment only.
   - Do not expose it to the browser.
   - After adding it, the `إدارة حساباتي` section in `/admin` can create more admin users.

## Important notes

- Never expose a Supabase service-role key with a `NEXT_PUBLIC_` prefix.
- It is acceptable to keep `SUPABASE_SERVICE_ROLE_KEY` in server-only environment variables when you want dashboard-based admin account creation.
- Public catalog reads and order submission use the client-side public key plus RLS.
- The first-admin bootstrap flow is intentionally handled through `/admin/login`.