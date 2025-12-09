# Dispatcher Phone System

## What We're Building

A custom phone system to replace 3CX for a transportation dispatch company. Browser-based softphone with queue management, eventually embedded in InstaRoute SaaS.

## Goals

1. **Replace 3CX** — Eliminate per-seat licensing and hosting costs
2. **AI IVR** — Natural voice routing ("dispatch", "accounting", "sales") via Barbara
3. **Dispatcher Softphone** — Browser-based, shows queue, answers calls
4. **Manager App** — Simple dialer + SMS (no queue), works on mobile
5. **Call Logging** — Recordings, transcripts, summaries stored for history
6. **Future** — Sell as InstaRoute feature (multi-tenant)

## User Experience

### Single Auth Flow
- User clicks "Sign in with Google"
- Supabase Auth handles Google SSO
- Backend creates/retrieves SignalWire Subscriber
- Browser SDK connects with token
- User never sees SignalWire — it's invisible infrastructure

### Dispatcher View
- Queue panel: callers waiting, wait times
- "Answer Next" button
- Dialpad for outbound
- Active call controls (mute, hold, transfer)
- Embeds in Missive sidebar (iframe) and InstaRoute

### Manager View
- Same app, role-based UI
- Dialpad only (no queue)
- SMS/MMS inbox
- Works as Capacitor mobile app later

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | Vue 3 + shadcn-vue | Softphone UI |
| Build | Vite | Fast dev/build |
| Hosting | Vercel | Static + serverless functions |
| Auth | Supabase Auth | Google SSO |
| Database | Supabase | Call logs, user prefs, voicemail state |
| Telephony | SignalWire Call Fabric | Calls, queues, recordings |
| IVR | SignalWire SWML + Call Flow Builder | Voice routing |
| Transcription | SignalWire live_transcribe | Built-in |
| Summaries | SignalWire action.summarize | Built-in |
| Mobile (later) | Capacitor | iOS/Android wrap |

## Phases

### Phase 1: AI IVR + Dispatcher Softphone
- Barbara-style voice IVR (routes to dispatch/accounting/sales/HR)
- Browser softphone with queue visibility
- Recording + transcription enabled
- Iframe embed for Missive

### Phase 2: Manager App + SMS + Voicemail
- Role-based views (dispatcher vs manager)
- SMS/MMS inbox
- Voicemail-to-email with transcription
- Call history + summaries stored in Supabase
- Capacitor mobile wrap

### Phase 3: Kill 3CX
- All users migrated
- Parallel test period
- Decommission 3CX server

### Future: InstaRoute Multi-Tenant
- Per-customer phone numbers
- Per-customer queues
- Barbara handles dispatch intents (trip status, booking)
- Usage-based billing

## Key Decisions Made

- **No per-seat pricing** — SignalWire is usage-based
- **SignalWire native AI** — Using their transcription/summaries instead of external services
- **Single auth** — Google SSO only, SignalWire tokens are backend concern
- **Supabase for app data** — SignalWire stores telephony, Supabase stores app state
- **Vue 3 Composition API** — Consistent with existing InstaRoute codebase
