# Session Postmortem - December 9, 2024

## Summary
Wasted ~3 hours trying to make Browser SDK control outbound caller ID. It can't.

---

## What We Built (Working)
- Vue.js dialer UI with Tailwind
- Supabase auth (Google OAuth)
- SignalWire Browser SDK connection
- Microphone permissions handling
- Outbound calls DO connect and ring through
- Call logging to Supabase `calls` table
- Call state tracking (ringing, answered, ended)

## What's Broken
**Caller ID cannot be controlled via Browser SDK.**

### The Problem
When placing outbound calls via Browser SDK `client.dial()`:
- The `from` parameter is **ignored**
- Calls route through: `Browser SDK → Relay → SIP trunk (acs/3CX) → PSTN`
- A mystery number `+16823152739` (682 area code) is used as caller ID
- This number **does not exist** in the SignalWire account
- It's injected somewhere in the Relay/SIP trunk chain

### What We Tried (All Failed)
1. **`from` parameter in `dial()`** - Ignored by SDK
2. **`fromFabricAddressId` parameter** - Not a real parameter, doesn't exist in docs
3. **SWML Resource** - Created `dispatch-outbound` but address `/public/dispatch-outbound` didn't resolve
4. **Various dial() configurations** - None affected caller ID

### Root Cause
Browser SDK is designed for **inbound/WebRTC**, not outbound PSTN with caller ID control.

Looking at SignalWire docs:
- **Browser SDK** (`@signalwire/js`): `client.dial({ to })` - NO `from` parameter
- **Realtime SDK** (`@signalwire/realtime-api`): `voiceClient.dialPhone({ from, to })` - HAS `from` parameter

The caller ID control exists in **Realtime SDK** (server-side), not Browser SDK (client-side).

---

## Where We Left Off

### Current State
- Browser SDK connects and places calls
- Calls work but use wrong caller ID
- UI is functional
- Call logging works

### Files Modified Today
- `src/composables/useCallFabric.js` - Main call handling logic
- `src/views/PhoneView.vue` - Phone UI integration
- `supabase/migrations/20241209_call_logging.sql` - Call logging schema

---

## What Needs to Happen Next

### Architecture Change Required
Must switch from Browser SDK to **Relay SDK** for call control.

```
CURRENT (Broken):
Browser SDK → [no caller ID control] → PSTN

NEEDED:
┌──────────────────┐         ┌─────────────────────┐
│  Browser         │   API   │  Backend Server     │
│  - Vue UI        │ ◄─────► │  - Relay SDK        │
│  - WebRTC audio  │         │  - dialPhone({      │
│    (Video Room)  │         │      from: "+1...", │
└──────────────────┘         │      to: "+1..."    │
                             │    })               │
                             └─────────────────────┘
```

### Implementation Plan
1. **Create backend service** with `@signalwire/realtime-api`
2. **Browser joins SignalWire Video Room** for WebRTC audio
3. **Backend dials PSTN** with correct `from` number
4. **Backend bridges** PSTN call to Video Room
5. **Dispatcher hears caller** through Video Room WebRTC

### Benefits of This Approach
- Full caller ID control via `from` parameter
- Multi-tenant ready (pass caller ID per request)
- Can assign different numbers to different dispatch groups
- Replaces 3CX entirely (no more SIP trunk routing)

---

## Mystery to Solve
Where is `+16823152739` coming from? It's not in the account. Possibilities:
- Hardcoded in the `acs` SIP endpoint config
- Default in some Relay app
- SignalWire system default

**Ask SignalWire support** where this number originates.

---

## Time Wasted
~3 hours debugging Browser SDK caller ID that was never going to work.

**Lesson learned:** Read the SDK docs more carefully. Browser SDK docs show `dial({ to })` - no `from`. That should have been the signal to look at Realtime SDK earlier.

---

## Key Insight (User Research)

**Call Fabric / Browser SDK:** Caller ID is set at the Subscriber or Resource level — not per-call from the browser.

**RELAY SDK:** You control `from` on every dial — but requires backend server.

---

## RESOLUTION: Assign Number to Subscriber

**Tested and confirmed:** Assigning phone number to SignalWire Subscriber makes Browser SDK calls use that number as caller ID.

**Decision: Keep Browser SDK** — simpler, already working, meets requirements.

---

## Architecture Going Forward

**Users First, Assignments Second**

```sql
-- Source of truth
users
├── id (from auth.users)
├── email
├── name
├── role

-- Shared lines for groups
dispatch_groups
├── id
├── name
├── signalwire_subscriber_id
├── phone_number

-- Flexible mapping (user can have multiple assignments)
user_assignments
├── id
├── user_id
├── group_id (nullable) ─────► dispatch_groups
├── direct_subscriber_id (nullable)
├── direct_phone (nullable)
├── is_default
```

**Examples:**

| User | Assignment |
|------|------------|
| Alex (dispatcher) | group: "Dispatch" → shared line |
| Jordan (dispatcher) | group: "Dispatch" + direct: own number |
| Sam (manager) | direct: own number only |
| Taylor (flex) | group: "Dispatch" + group: "Sales" |

**Token Flow:**
```
User logs in
    ↓
Get user's assignments from Supabase
    ↓
Multiple assignments?
    YES → Use is_default, or let them pick in UI
    NO  → Use the one they have
    ↓
Get token for that Subscriber
```

**UI Bonus:** Dropdown if multiple lines — "Calling as: Dispatch / My Line"

**InstaRoute Multi-tenant:** Each customer's users get assigned to that customer's group.

---

## Next Session Tasks

1. Create `dispatch_groups` table in Supabase
2. Create `user_assignments` table in Supabase
3. Update `get-signalwire-token` Edge Function:
   - Lookup user's assignments
   - If multiple → use `is_default`
   - Get token for correct Subscriber
4. Add UI dropdown for "Calling as: X" if user has multiple assignments
5. Test scenarios:
   - Dispatcher with group assignment only
   - Dispatcher with group + own number
   - Manager with own number only

**Relay SDK is NOT needed** — can add later if per-call CID flexibility required.

