# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vue App (Vercel)                           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Login     │  │   Dialer    │  │      Queue Panel        │ │
│  │  (Google)   │  │  Component  │  │  (dispatchers only)     │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              useCallFabric.js composable                 │  │
│  │         (SignalWire Browser SDK wrapper)                 │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Vercel Serverless Functions                   │
│                                                                 │
│  /api/auth/callback     ← Google OAuth callback                 │
│  /api/softphone/token   ← Generate SignalWire Subscriber token  │
│  /api/webhooks/call     ← Call completed events                 │
│  /api/webhooks/recording← Recording ready events                │
│  /api/webhooks/transcript← Transcription complete               │
│  /api/webhooks/sms      ← Inbound SMS                           │
│                                                                 │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│        SignalWire         │   │          Supabase             │
│                           │   │                               │
│  • Call Fabric            │   │  • users (Google ID → SW)     │
│  • Subscribers            │   │  • calls (history + logs)     │
│  • Queues                 │   │  • voicemails                 │
│  • SWML (IVR logic)       │   │  • sms_threads                │
│  • Browser SDK            │   │  • user_preferences           │
│  • Recordings             │   │                               │
│  • Transcriptions         │   │                               │
│  • Summaries              │   │                               │
│                           │   │                               │
└───────────────────────────┘   └───────────────────────────────┘
```

## Auth Flow

```
1. User clicks "Sign in with Google"
         │
         ▼
2. Supabase Auth → Google OAuth
         │
         ▼
3. Callback returns user.id + email
         │
         ▼
4. Frontend calls POST /api/softphone/token
         │
         ▼
5. Backend:
   a. Verify Supabase session
   b. Look up user in Supabase → get signalwire_subscriber_id
   c. If no subscriber: create one via SignalWire API
   d. Generate SignalWire Subscriber token
   e. Return token to frontend
         │
         ▼
6. Frontend initializes Browser SDK with token
         │
         ▼
7. User can make/receive calls
```

## Call Flow (Inbound)

```
Caller dials your number
         │
         ▼
SignalWire routes to SWML script
         │
         ▼
Barbara IVR: "How can I help?"
         │
         ├── "Dispatch" ────► Dispatch Queue
         │                         │
         │                         ▼
         │                    Available dispatcher's
         │                    Browser SDK rings
         │                         │
         │                         ▼
         │                    Dispatcher answers
         │                         │
         │                         ▼
         │                    Call connected
         │                    (recording + transcription ON)
         │                         │
         │                         ▼
         │                    Call ends
         │                         │
         │                         ▼
         │                    Webhooks fire:
         │                    • call.completed
         │                    • recording.ready
         │                    • transcription.complete
         │                    • summarize.complete
         │                         │
         │                         ▼
         │                    Vercel functions write to Supabase
         │
         ├── "Accounting" ──► Accounting extension/voicemail
         ├── "Sales" ───────► Sales extension/voicemail
         └── "HR" ──────────► HR extension/voicemail
```

## Queue Mechanics

```
Dispatch Queue (SignalWire)
         │
         ├── Caller 1 (waiting 2:30)
         ├── Caller 2 (waiting 1:15)
         └── Caller 3 (waiting 0:45)
         
Dispatchers (Browser SDK connected):
         │
         ├── Alex (status: available) ◄── can receive calls
         ├── Jordan (status: busy)    ◄── on a call
         └── Sam (status: away)       ◄── not receiving
         
Distribution: Ring available dispatchers
When answered: Caller removed from queue, connected to dispatcher
```

## Webhook Data Flow

```
SignalWire Event                 Vercel Function              Supabase Table
─────────────────               ─────────────────            ───────────────
call.completed        ───►      /api/webhooks/call    ───►   calls (insert)
recording.ready       ───►      /api/webhooks/recording ──►  calls (update recording_url)
transcription.complete ──►      /api/webhooks/transcript ──► calls (update transcript)
summarize.complete    ───►      /api/webhooks/summary  ───►  calls (update summary)
message.received      ───►      /api/webhooks/sms      ───►  sms_messages (insert)
voicemail.received    ───►      /api/webhooks/voicemail ──►  voicemails (insert)
```

## Environment Variables

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SignalWire
SIGNALWIRE_PROJECT_ID=
SIGNALWIRE_API_TOKEN=
SIGNALWIRE_SPACE_URL=

# App
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
