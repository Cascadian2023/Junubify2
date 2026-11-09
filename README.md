# Junubify

A Vite + React web preview for the Junubify South Sudan music platform.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Current feature status

- **Song upload:** the Artist Studio accepts audio files up to 50 MB and creates a playable preview in the current browser session. Audio is held in browser memory only; it is not uploaded, saved durably, or published to other users. Do not upload copyrighted material unless you have distribution rights.
- **Monetization:** plan and royalty information is displayed, but checkout and payouts are intentionally disabled. The original interface's money amounts, payout messages, and provider labels were mock UI—not connected payment services. No payment is taken or payout sent by this preview.

Before launch, add authenticated server-side audio storage/catalog APIs, creator rights and moderation workflows, and a real payment provider integration with server-side secrets, signed webhooks, subscription state, royalty accounting, and payout compliance. No payment credentials belong in browser code.
