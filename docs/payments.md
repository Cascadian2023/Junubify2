# Payment integration foundation

This repository now has a server-owned payment ledger schema and two Supabase Edge Function endpoints as safe placeholders. **No payment provider is integrated; checkout, webhook processing, subscriptions, refunds, and artist payouts remain disabled.** The endpoints return HTTP 503 rather than pretending a transaction succeeded.

## Install the schema

Apply `supabase/migrations/20261109020000_payment_foundation.sql` to the Supabase project after the existing platform migration. Payment orders are readable by their owner only. Client roles cannot insert or change order status; trusted server-side code must own those operations.

## Edge Functions

Deploy `create-checkout` and `payment-webhook` when ready to test the API contract. They intentionally fail closed until provider onboarding and an implementation are complete. Do not mark an order paid based on a client redirect. Before enabling a provider, implement server-side plan/price lookup, authenticated checkout creation, provider signature verification, provider-side status reconciliation, idempotent event handling, and safe entitlement fulfillment.

## Provider onboarding still required

Confirm directly with M-Gurush, MTN MoMo, or a card acquirer that it can onboard the South Sudan merchant entity and provide sandbox credentials, API/webhook documentation, settlement details, and refund/chargeback support. Confirm recurring billing and artist payouts separately; do not assume they are included in merchant checkout.

Store credentials only in Supabase Edge Function secrets. Never expose provider secrets or Supabase service-role credentials in `VITE_` variables, frontend code, or client responses. Do not share secrets in chat.

## Not production-ready

No live Supabase project was accessed or changed by this code scaffold, and no provider sandbox or live transaction has been tested. Do not advertise payment acceptance until a verified provider adapter and end-to-end tests are in place.
