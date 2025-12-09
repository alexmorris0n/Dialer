# Vue Components

All components use Vue 3 Composition API + shadcn-vue for styling.

## Directory Structure

```
src/
├── components/
│   ├── phone/
│   │   ├── Dialer.vue           # Dialpad + call button
│   │   ├── CallControls.vue     # Mute, hold, hangup during call
│   │   ├── IncomingCall.vue     # Incoming call notification
│   │   └── ActiveCall.vue       # Active call display
│   ├── queue/
│   │   ├── QueuePanel.vue       # Queue list container
│   │   ├── QueueItem.vue        # Single caller in queue
│   │   └── QueueStats.vue       # Summary stats
│   ├── sms/
│   │   ├── SmsInbox.vue         # Thread list
│   │   ├── SmsThread.vue        # Single conversation
│   │   └── SmsCompose.vue       # New message
│   └── layout/
│       ├── AppShell.vue         # Main layout wrapper
│       ├── Sidebar.vue          # Navigation (if needed)
│       └── StatusBar.vue        # User status toggle
├── composables/
│   ├── useCallFabric.js         # SignalWire Browser SDK wrapper
│   ├── useAuth.js               # Supabase auth
│   ├── useQueue.js              # Queue state management
│   └── useSms.js                # SMS operations
├── stores/
│   ├── user.js                  # Pinia store for user state
│   ├── calls.js                 # Call history
│   └── sms.js                   # SMS threads
└── views/
    ├── PhoneView.vue            # Main phone interface
    ├── SmsView.vue              # SMS inbox view
    ├── HistoryView.vue          # Call history
    └── LoginView.vue            # Google sign-in
```

---

## Component Specs

### Dialer.vue

**Purpose:** Dialpad for making outbound calls

**Props:**
- None (uses composable for state)

**State:**
- `phoneNumber: string` - Number being dialed
- `isDialing: boolean` - Currently placing call

**UI:**
```
┌─────────────────────┐
│  +1 (555) 123-4567  │  ← Input field
├─────────────────────┤
│  [1]   [2]   [3]    │
│  [4]   [5]   [6]    │
│  [7]   [8]   [9]    │
│  [*]   [0]   [#]    │
├─────────────────────┤
│      [📞 Call]      │  ← Green call button
└─────────────────────┘
```

**Actions:**
- Click digit → append to phoneNumber
- Click Call → `callFabric.dial(phoneNumber)`
- Backspace → remove last digit

---

### CallControls.vue

**Purpose:** Controls during active call

**Props:**
- `call: Object` - Active call object from SDK

**State:**
- `isMuted: boolean`
- `isOnHold: boolean`
- `duration: number` - Call duration in seconds

**UI:**
```
┌─────────────────────────────┐
│    00:45                    │  ← Duration timer
│    +1 (555) 123-4567        │  ← Caller ID
├─────────────────────────────┤
│  [🔇 Mute]  [⏸ Hold]        │
│         [📞 End]            │  ← Red hangup button
└─────────────────────────────┘
```

**Actions:**
- Mute → `call.audioMute()` / `call.audioUnmute()`
- Hold → `call.hold()` / `call.unhold()`
- End → `call.hangup()`

---

### IncomingCall.vue

**Purpose:** Notification for incoming call

**Props:**
- `call: Object` - Incoming call object

**UI:**
```
┌─────────────────────────────┐
│  📞 Incoming Call           │
│  +1 (555) 123-4567          │
│                             │
│  [✓ Answer]   [✗ Decline]   │
└─────────────────────────────┘
```

**Actions:**
- Answer → `call.answer()`
- Decline → `call.hangup()`

---

### QueuePanel.vue

**Purpose:** Shows callers waiting in queue (dispatchers only)

**Props:**
- None (subscribes to queue state)

**State:**
- `callers: Array` - List of waiting callers
- `isLoading: boolean`

**UI:**
```
┌─────────────────────────────┐
│  Queue: 3 waiting           │
├─────────────────────────────┤
│  🔴 +1 (555) 111-1111  2:30 │
│  🟡 +1 (555) 222-2222  1:15 │
│  🟢 +1 (555) 333-3333  0:45 │
├─────────────────────────────┤
│      [Answer Next]          │
└─────────────────────────────┘
```

**Color coding:** Wait time (red > 2min, yellow > 1min, green < 1min)

**Actions:**
- Answer Next → Accept next call from queue

---

### QueueItem.vue

**Purpose:** Single caller in queue list

**Props:**
- `caller: Object` - { phone, waitTime, position }

**UI:**
- Phone number
- Wait time (formatted mm:ss)
- Color indicator

---

### StatusBar.vue

**Purpose:** User's availability status

**Props:**
- None (uses user store)

**State:**
- `status: 'available' | 'busy' | 'away' | 'offline'`

**UI:**
```
┌─────────────────────────────┐
│  Alex D.  [🟢 Available ▼]  │
└─────────────────────────────┘
         ↓ Dropdown
┌─────────────────────────────┐
│  🟢 Available               │
│  🟡 Away                    │
│  🔴 Offline                 │
└─────────────────────────────┘
```

**Actions:**
- Select status → Update Subscriber status, affects queue membership

---

### SmsInbox.vue

**Purpose:** List of SMS conversations

**Props:**
- None (uses SMS store)

**UI:**
```
┌─────────────────────────────┐
│  Messages                   │
├─────────────────────────────┤
│  +1 (555) 111-1111          │
│  Where is my driver?  2m    │
├─────────────────────────────┤
│  +1 (555) 222-2222          │
│  Thanks!             1h     │
├─────────────────────────────┤
│  [+ New Message]            │
└─────────────────────────────┘
```

**Actions:**
- Click thread → Open SmsThread
- New Message → Open SmsCompose

---

### SmsThread.vue

**Purpose:** Single SMS conversation

**Props:**
- `threadId: string` - Phone number

**UI:**
```
┌─────────────────────────────┐
│  ← +1 (555) 111-1111        │
├─────────────────────────────┤
│        [Where is my driver?]│  ← Inbound (left aligned)
│                             │
│  [5 minutes away]           │  ← Outbound (right aligned)
│                             │
├─────────────────────────────┤
│  [Type message...]  [Send]  │
└─────────────────────────────┘
```

**Actions:**
- Send → POST /api/sms/send

---

## Composables

### useCallFabric.js

```javascript
// Returns:
{
  // State
  client: Ref<SignalWireClient>,
  isConnected: Ref<boolean>,
  activeCall: Ref<Call | null>,
  incomingCall: Ref<Call | null>,
  
  // Actions
  connect(token: string): Promise<void>,
  disconnect(): Promise<void>,
  dial(phoneNumber: string): Promise<Call>,
  answer(): Promise<void>,
  hangup(): Promise<void>,
  mute(): Promise<void>,
  unmute(): Promise<void>,
  
  // Queue
  goOnline(queues: string[]): Promise<void>,
  goOffline(): Promise<void>,
}
```

### useAuth.js

```javascript
// Returns:
{
  // State
  user: Ref<User | null>,
  isAuthenticated: Ref<boolean>,
  isLoading: Ref<boolean>,
  
  // Actions
  signInWithGoogle(): Promise<void>,
  signOut(): Promise<void>,
  getToken(): Promise<string>,  // SignalWire token
}
```

### useQueue.js

```javascript
// Returns:
{
  // State
  callers: Ref<QueueCaller[]>,
  stats: Ref<QueueStats>,
  isLoading: Ref<boolean>,
  
  // Actions
  refresh(): Promise<void>,
  answerNext(): Promise<void>,
}
```

### useSms.js

```javascript
// Returns:
{
  // State
  threads: Ref<SmsThread[]>,
  currentThread: Ref<SmsMessage[]>,
  isLoading: Ref<boolean>,
  
  // Actions
  loadThreads(): Promise<void>,
  loadThread(phoneNumber: string): Promise<void>,
  sendMessage(to: string, body: string, mediaUrls?: string[]): Promise<void>,
}
```
