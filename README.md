# Dispatcher Phone System

Browser-based phone system built with Vue 3 + SignalWire Call Fabric + Supabase. Replaces 3CX for transportation dispatch company.

## Features (Planned)

- **AI IVR** - Natural language call routing ("dispatch", "accounting", etc.)
- **Dispatcher Softphone** - Browser-based dialer with queue visibility
- **Single Auth** - Google SSO via Supabase (SignalWire tokens handled server-side)
- **Call Recording** - Automatic recording, transcription, and AI summaries
- **Iframe Embeddable** - Works in Missive sidebar and InstaRoute dispatch software

## Tech Stack

- **Frontend**: Vue 3 (Composition API) + Vite + Tailwind CSS + shadcn-vue
- **State**: Pinia
- **Routing**: Vue Router
- **Auth & Database**: Supabase
- **Telephony**: SignalWire Call Fabric + Browser SDK
- **Hosting**: Vercel (static + serverless functions)

## Project Structure

```
src/
├── components/
│   ├── phone/          # Dialer, call controls, incoming call UI
│   ├── queue/          # Queue panel, queue items, stats
│   ├── sms/            # SMS inbox, threads, compose
│   └── layout/         # App shell, sidebar, status bar
├── composables/
│   ├── useCallFabric.js   # SignalWire Browser SDK wrapper
│   ├── useAuth.js         # Supabase auth
│   ├── useQueue.js        # Queue state management
│   └── useSms.js          # SMS operations
├── stores/
│   ├── user.js            # User state (Pinia)
│   ├── calls.js           # Call history
│   └── sms.js             # SMS threads
├── views/
│   ├── LoginView.vue      # Google sign-in
│   ├── PhoneView.vue      # Main phone interface
│   ├── HistoryView.vue    # Call history
│   └── SmsView.vue        # SMS inbox
├── lib/
│   └── supabase.js        # Supabase client
├── router/
│   └── index.js           # Vue Router config
└── main.js
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `docs/SCHEMA.sql` in the SQL Editor
3. Enable Google Auth in Authentication settings
4. Copy your project URL and anon key

### 3. Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Note**: SignalWire credentials are backend-only and will be configured in Vercel later.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Current Status

✅ **Phase 1A Complete** - Foundation setup
- Vue 3 + Vite initialized
- Dependencies installed (Tailwind, shadcn-vue, SignalWire, Supabase, Pinia, Vue Router)
- Folder structure created
- Vue Router configured with routes: `/login`, `/phone`, `/history`, `/sms`
- Placeholder files for all components, composables, and stores
- Supabase client setup

🚧 **Next: Phase 1B** - Auth Flow
- Implement Google sign-in with Supabase
- Create Vercel function for SignalWire token generation
- Set up SignalWire Subscribers

## Build Phases

See `docs/BUILD-SEQUENCE.md` for detailed build order.

- **Phase 1A**: Foundation ✅
- **Phase 1B**: Auth Flow (Day 1-2)
- **Phase 1C**: Basic Dialer (Day 2-3)
- **Phase 1D**: Incoming Calls (Day 3-4)
- **Phase 1E**: IVR Setup (Day 4-5)
- **Phase 1F**: Queue Integration (Day 5-6)
- **Phase 1G**: Webhooks + Logging (Day 6-7)
- **Phase 1H**: Deploy + Test (Day 7)

## Documentation

- `docs/AI-CONTEXT.md` - Quick overview
- `docs/PROJECT.md` - Goals and phases
- `docs/ARCHITECTURE.md` - System design and flows
- `docs/BUILD-SEQUENCE.md` - Step-by-step build order
- `docs/COMPONENTS.md` - Vue component specs
- `docs/SIGNALWIRE-REFERENCE.md` - API patterns

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## License

Proprietary - Internal use only
