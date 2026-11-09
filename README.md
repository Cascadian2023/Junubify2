# Junubify

Vite + React music platform with a Supabase-backed, authenticated artist submission flow. Payment screens are deliberately non-functional until a real merchant/provider integration is selected and configured.

## Run the web app

```sh
npm install
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

The anon/publishable key is intended for browser use only. Never put a Supabase `service_role` key, payment secret, or webhook secret in a `VITE_` variable.

## Configure persistent song submissions

1. Create a Supabase project and enable email authentication (configure allowed redirect URLs for your deployed site).
2. Run `supabase/migrations/20261109000000_platform_backend.sql` in the project SQL editor.
3. Set the project URL and anon/publishable key in `.env.local` and in your web host's environment settings.
4. Start the app. Artists request an email sign-in link, then submit metadata and audio from Artist Studio.

Audio uploads go to a private 50 MB bucket under the authenticated artist's UUID. Database and storage row-level security restrict upload/read access; new tracks remain `pending_review`. Only a trusted administrator/backend should approve a track by changing its status to `published`. The public catalog fetches published rows, and audio is served with temporary signed URLs. The UI's sample tracks remain demo content.

Before launch, add an admin review workflow, rate limits/abuse controls, stronger content validation/scanning, backup/retention policies, and production auth email configuration. The browser file size/type checks are usability checks, not a security boundary.

## Deploy to Vercel

`vercel.json` configures the Vite build (`npm run build`, output `dist`) and SPA fallback. To publish, import `Prototype20204/Junubify2` in Vercel and deploy the `main` branch. In the Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the environments you intend to use, then redeploy. Add the deployed site URL to Supabase Auth's allowed redirect URLs. Without Supabase variables, the static preview can still build, but backend login and uploads remain unavailable.

## Payments: not activated

This repository does not yet have a payment processor integration, and no payment or payout is made. Local providers have different merchant APIs, eligibility, webhook signatures, settlement/currency rules, and payout requirements; do not assume any provider is available for your business or country. To implement the real flow, choose the provider and merchant product you have access to and give the team its official API documentation and sandbox onboarding instructions. Keep credentials in server-side secrets, never in the browser. The `payment_events` and `royalty_ledger` tables are server-only foundations, not proof of received payments or payable earnings.

A production payment integration must create checkout sessions server-side, verify signed provider webhooks, process event IDs idempotently, reconcile settlements/refunds, grant entitlements only after verified payment, and calculate royalties from reconciled revenue. Payouts additionally need provider support, artist identity/compliance checks, and reconciliation. The proposed plan prices and 70% split are product placeholders until terms and financial rules are confirmed.
