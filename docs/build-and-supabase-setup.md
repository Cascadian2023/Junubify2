# Build checks and Supabase setup

## Build check

The GitHub Actions workflow at `.github/workflows/build.yml` runs for pushes and pull requests targeting `main`. It installs dependencies with Node.js 20 and runs `npm run build`; it does not connect to Datadog or require repository secrets.

## Apply the Supabase migrations

For a new Supabase project, apply the SQL migrations in timestamp order from the repository root:

1. `supabase/migrations/20261109000000_platform_backend.sql`
2. `supabase/migrations/20261109010000_audio_cleanup_policy.sql`
3. `supabase/migrations/20261109020000_payment_foundation.sql`

The second migration adds the storage cleanup policy used when an audio upload succeeds but track metadata insertion fails. The payment migration only creates a restricted ledger foundation; payment checkout, webhooks, and payouts remain disabled until a provider integration is implemented and verified.

Never put Supabase service-role credentials, payment secrets, or webhook secrets in frontend `VITE_` variables. The browser app should use only the Supabase project URL and its anon/publishable key.
