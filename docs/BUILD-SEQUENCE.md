# Build Sequence

Step-by-step guide for building the dispatcher phone system.

---

## Phase 1A: Foundation (Day 1)

### Step 1: Project Setup
```bash
npm create vite@latest dispatcher-phone -- --template vue
cd dispatcher-phone
npm install
```

### Step 2: Install Dependencies
```bash
# UI
npm install @shadcn/ui tailwindcss autoprefixer postcss
npx shadcn-vue@latest init

# SignalWire
npm install @signalwire/js

# Supabase
npm install @supabase/supabase-js

# State management
npm install pinia

# Routing (if needed)
npm install vue-router
```

### Step 3: Supabase Setup
1. Create Supabase project at supabase.com
2. Run `SCHEMA.sql` in SQL Editor
3. Enable Google Auth provider in Authentication settings
4. Copy project URL and anon key

### Step 4: Environment Variables
Create `.env`:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 5: Folder Structure
Create directories matching `COMPONENTS.md` structure.

**Deliverable:** Empty Vue project with dependencies, Supabase ready.

---

## Phase 1B: Auth Flow (Day 1-2)

### Step 1: Supabase Client
Create `src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Step 2: Auth Composable
Create `src/composables/useAuth.js` per COMPONENTS.md spec.

### Step 3: Login View
Create `src/views/LoginView.vue`:
- Google sign-in button
- Redirect to PhoneView on success

### Step 4: Token Endpoint
Create `api/softphone/token.js` (Vercel function):
- Verify Supabase session
- Create/get SignalWire Subscriber
- Return token

### Step 5: SignalWire Subscriber Setup
In SignalWire dashboard:
- Create test Subscriber manually
- Note the subscriber ID for testing

**Deliverable:** User can sign in with Google, get SignalWire token.

---

## Phase 1C: Basic Dialer (Day 2-3)

### Step 1: CallFabric Composable
Create `src/composables/useCallFabric.js`:
- Initialize SignalWire client with token
- Basic dial() function
- Call state management

### Step 2: Dialer Component
Create `src/components/phone/Dialer.vue`:
- Dialpad UI (use shadcn buttons)
- Phone number input
- Call button

### Step 3: Test Outbound Call
- Enter a phone number
- Click call
- Verify call connects

**Deliverable:** Can make outbound calls from browser.

---

## Phase 1D: Incoming Calls (Day 3-4)

### Step 1: Update Composable
Add to `useCallFabric.js`:
- Listen for `call.received` event
- Expose `incomingCall` state
- Add `answer()` function

### Step 2: Incoming Call Component
Create `src/components/phone/IncomingCall.vue`:
- Shows caller ID
- Answer/Decline buttons

### Step 3: Active Call Component
Create `src/components/phone/ActiveCall.vue`:
- Duration timer
- Call controls (mute, end)

### Step 4: Call Controls Component
Create `src/components/phone/CallControls.vue`:
- Mute button
- End call button

### Step 5: SignalWire Number Setup
- Configure SignalWire phone number
- Point to test SWML or direct to Subscriber

**Deliverable:** Can receive and answer incoming calls.

---

## Phase 1E: IVR Setup (Day 4-5)

### Step 1: SWML Script
Create IVR in SignalWire:
- Greeting: "Thanks for calling, how can I help?"
- Speech recognition for: dispatch, accounting, sales, HR
- Route to appropriate destination

### Step 2: Call Flow Builder (Alternative)
If visual preferred:
- Create flow in SignalWire dashboard
- Drag-and-drop IVR logic

### Step 3: Connect Phone Number
- Point inbound number to SWML script
- Test each routing path

**Deliverable:** Callers hear IVR, get routed correctly.

---

## Phase 1F: Queue Integration (Day 5-6)

### Step 1: Create Queue
In SignalWire dashboard:
- Create "dispatch-queue" resource
- Configure settings (hold music, timeout)

### Step 2: Update SWML
- "Dispatch" intent routes to queue
- Enable recording + transcription on queue calls

### Step 3: Queue Composable
Create `src/composables/useQueue.js`:
- `goOnline()` - join queue
- `goOffline()` - leave queue
- Queue stats (if available from SDK)

### Step 4: Queue Panel Component
Create `src/components/queue/QueuePanel.vue`:
- List of waiting callers
- "Answer Next" button

### Step 5: Status Bar Component
Create `src/components/layout/StatusBar.vue`:
- Status dropdown (available/away/offline)
- Updates queue membership

**Deliverable:** Dispatchers see queue, can answer calls from queue.

---

## Phase 1G: Webhooks + Logging (Day 6-7)

### Step 1: Webhook Endpoints
Create Vercel functions per API-ENDPOINTS.md:
- `/api/webhooks/call.js`
- `/api/webhooks/recording.js`
- `/api/webhooks/transcript.js`
- `/api/webhooks/summary.js`

### Step 2: Configure SignalWire Webhooks
In SignalWire dashboard, point to your Vercel URLs.

### Step 3: Test Webhook Flow
- Make test call
- Verify data appears in Supabase

### Step 4: Call History View
Create `src/views/HistoryView.vue`:
- List of past calls from Supabase
- Show recording, transcript, summary

**Deliverable:** All calls logged with recordings and transcripts.

---

## Phase 1H: Deploy + Test (Day 7)

### Step 1: Vercel Deployment
```bash
npm install -g vercel
vercel
```

### Step 2: Environment Variables
Set in Vercel dashboard:
- All env vars from `.env`
- SignalWire credentials

### Step 3: Update Webhooks
Change webhook URLs to production Vercel URLs.

### Step 4: Team Testing
- Create Subscribers for test users
- Test full flow: IVR → queue → answer → recording

**Deliverable:** Phase 1 complete, deployed to production.

---

## References

- See `docs/REFERENCES.md` for SignalWire dialer examples and a call-widget smoke test link.

---

## Phase 2: Manager App + SMS (Week 2)

### Step 1: Role-Based Views
- Check user role from Supabase
- Dispatchers see queue, managers don't

### Step 2: SMS Integration
- Create SMS composable
- Build SMS inbox/thread components
- Webhook for inbound SMS
- API for outbound SMS

### Step 3: Voicemail
- SWML handles voicemail when queue empty
- Webhook stores voicemail in Supabase
- UI to play/read voicemails

### Step 4: Mobile (Capacitor)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

**Deliverable:** Full manager app with SMS, ready for mobile.

---

## Testing Checklist

### Phase 1 Complete When:
- [ ] User can sign in with Google
- [ ] Softphone connects to SignalWire
- [ ] Can make outbound calls
- [ ] Can receive inbound calls
- [ ] IVR routes calls correctly
- [ ] Dispatchers see queue
- [ ] Can answer calls from queue
- [ ] Calls are recorded
- [ ] Transcripts generated
- [ ] Summaries generated
- [ ] Call history visible
- [ ] Deployed to Vercel

### Phase 2 Complete When:
- [ ] Managers see simplified UI (no queue)
- [ ] SMS sending works
- [ ] SMS receiving works
- [ ] MMS works
- [ ] Voicemails recorded
- [ ] Voicemails transcribed
- [ ] Mobile app builds
- [ ] Push notifications work
