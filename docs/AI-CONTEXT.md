# AI Agent Context

**READ THIS FIRST** — This file summarizes the project for AI coding assistants.

## What You're Building

A browser-based phone system (softphone) for dispatchers at a transportation company. It replaces 3CX with a custom solution using SignalWire.

## Core Requirements

1. **Single Auth** — Google sign-in via Supabase. SignalWire tokens are generated server-side, invisible to user.

2. **Dispatcher Softphone** — Browser-based dialer with:
   - Dialpad for outbound calls
   - Incoming call notifications
   - Queue visibility (who's waiting)
   - "Answer Next" from queue
   - Status toggle (available/away/offline)

3. **AI IVR** — Natural language call routing:
   - "Dispatch" → Queue
   - "Accounting" → Extension
   - "Sales" → Extension
   - "HR" → Extension

4. **Call Logging** — All calls recorded, transcribed, summarized. Stored in Supabase.

5. **Iframe Embed** — Works in Missive sidebar and InstaRoute dispatch software.

## Tech Constraints

- **Vue 3 Composition API** — No Options API
- **shadcn-vue** — For all UI components
- **Pinia** — For state management
- **SignalWire Browser SDK** — `@signalwire/js` package
- **Supabase** — Auth + database
- **Vercel** — Hosting + serverless functions

## Key Files to Reference

| Need | File |
|------|------|
| Overall architecture | `docs/ARCHITECTURE.md` |
| Database schema | `docs/SCHEMA.sql` |
| API endpoints | `docs/API-ENDPOINTS.md` |
| SignalWire APIs | `docs/SIGNALWIRE-REFERENCE.md` |
| Component specs | `docs/COMPONENTS.md` |
| Build order | `docs/BUILD-SEQUENCE.md` |

## SignalWire Specifics

### Browser SDK Pattern
```javascript
import { SignalWire } from '@signalwire/js'

const client = await SignalWire({ token: 'subscriber_token' })

// Receive calls
client.on('call.received', (call) => {
  await call.answer()
})

// Make calls
const call = await client.dial({ to: '+15551234567', nodeId: 'resource-id' })

// Join queue
await client.online({ queues: ['dispatch-queue'] })
```

### Subscriber Token Flow
1. User authenticates with Google (Supabase)
2. Frontend calls `POST /api/softphone/token`
3. Backend creates/gets SignalWire Subscriber for user
4. Backend generates Subscriber token via SignalWire API
5. Frontend uses token to initialize Browser SDK

## Current Build Status

Starting from scratch. Follow `BUILD-SEQUENCE.md` in order.

## Common Gotchas

1. **Subscriber vs User** — Supabase has "users", SignalWire has "Subscribers". They're linked via `signalwire_subscriber_id` in the users table.

2. **Token Expiry** — SignalWire tokens expire. Set reasonable TTL and handle refresh.

3. **Queue Membership** — Must call `client.online({ queues: [...] })` to receive queue calls.

4. **CORS** — Vercel functions need proper CORS headers for browser requests.

5. **Webhooks** — SignalWire webhooks need public URLs. Use Vercel deployed URLs, not localhost.

## Don't Overthink

- Start simple: Make one outbound call work first
- Add features incrementally per BUILD-SEQUENCE.md
- Use SignalWire's built-in recording/transcription — don't build custom
- One composable per concern (auth, calls, queue, sms)
