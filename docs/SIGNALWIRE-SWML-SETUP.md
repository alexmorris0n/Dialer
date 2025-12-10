# SignalWire SWML Setup Guide

This document explains how to configure SignalWire to work with the dialer's SWML webhooks for:
- **Outbound calls** with dynamic caller ID control
- **Inbound calls** with parallel ring groups

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTBOUND CALL                                │
│                                                                      │
│  Browser UI                                                          │
│  ├── Select "Calling as: Dispatch (+1-650-394-6801)"                │
│  └── Dial +1-555-123-4567                                           │
│           │                                                          │
│           ▼                                                          │
│  Browser SDK: dial('/public/dispatch-outbound', {                   │
│    userVariables: {                                                  │
│      destination: '+15551234567',                                   │
│      callerID: '+16503946801'                                       │
│    }                                                                 │
│  })                                                                  │
│           │                                                          │
│           ▼                                                          │
│  SignalWire → Webhook: api/swml-outbound.js                         │
│           │                                                          │
│           ▼                                                          │
│  Returns SWML: connect { from: '+16503946801', to: '+15551234567' } │
│           │                                                          │
│           ▼                                                          │
│  ☎️  Phone rings with caller ID: +16503946801                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         INBOUND CALL                                 │
│                                                                      │
│  Someone calls +16503946801 (Dispatch number)                       │
│           │                                                          │
│           ▼                                                          │
│  SignalWire → Resource: dispatch-inbound                            │
│           │                                                          │
│           ▼                                                          │
│  Webhook: api/swml-inbound.js                                       │
│  ├── Query Supabase: "Who's in the Dispatch group?"                 │
│  └── Returns: [Alex, Jordan] (if online)                            │
│           │                                                          │
│           ▼                                                          │
│  SWML: connect { parallel: ['/private/alex', '/private/jordan'] }   │
│           │                                                          │
│           ▼                                                          │
│  🔔 All dispatchers' browsers ring simultaneously                    │
│  First to answer gets the call                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SignalWire Dashboard Configuration

### 1. Create `dispatch-outbound` Resource (Outbound Caller ID)

This resource handles outbound calls and sets the caller ID dynamically.

1. Go to **SignalWire Dashboard** → **Call Fabric** → **Resources**
2. Click **Create Resource** → **SWML Script**
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `dispatch-outbound` |
| **Address** | `/public/dispatch-outbound` |
| **Visibility** | Public (important!) |
| **SWML Source** | URL/Webhook |
| **URL** | `https://dialer-mu.vercel.app/api/swml-outbound` |
| **Method** | POST |

### 2. Create `dispatch-inbound` Resource (Inbound Ring Groups)

This resource handles incoming calls and rings all online dispatchers.

1. Create another **SWML Script** resource
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `dispatch-inbound` |
| **Address** | `/public/dispatch-inbound` |
| **Visibility** | Public |
| **SWML Source** | URL/Webhook |
| **URL** | `https://dialer-mu.vercel.app/api/swml-inbound` |
| **Method** | POST |

### 3. Assign Phone Number to Inbound Resource

1. Go to **Phone Numbers** in SignalWire Dashboard
2. Find your dispatch number (e.g., `+16503946801`)
3. Set **Handle Using**: Select the `dispatch-inbound` resource

---

## Vercel Environment Variables

For the inbound webhook to query Supabase for online dispatchers, add these to Vercel:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://wqybkkbfjvdwbtsuqoja.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (Get from Supabase Dashboard → Settings → API) |

**Note:** The service role key bypasses RLS, so keep it secure and only use it server-side.

---

## How the Code Works

### Outbound Flow (`api/swml-outbound.js`)

1. Browser SDK dials `/public/dispatch-outbound` with `userVariables`
2. SignalWire POSTs to the webhook with call info
3. Webhook extracts `destination` and `callerID` from the request
4. Returns SWML that connects to the destination with the specified caller ID

```javascript
// Browser SDK call
await dial(phoneNumber, { callerID: '+16503946801' })

// Which translates to:
client.dial({
  to: '/public/dispatch-outbound',
  userVariables: {
    destination: '+15551234567',
    callerID: '+16503946801'
  }
})
```

### Inbound Flow (`api/swml-inbound.js`)

1. Someone calls the dispatch number
2. SignalWire routes to `dispatch-inbound` resource
3. Webhook queries Supabase for dispatchers in that group
4. Returns SWML with parallel connect to all online dispatchers

```javascript
// SWML returned for parallel ring
{
  connect: {
    parallel: [
      { to: '/private/subscriber-id-1' },
      { to: '/private/subscriber-id-2' }
    ],
    timeout: 30
  }
}
```

---

## Database Schema

The system uses these Supabase tables:

### `dispatch_groups`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Group name (e.g., "Dispatch") |
| phone_number | text | E.164 format (e.g., "+16503946801") |
| signalwire_subscriber_id | text | Optional shared subscriber |

### `user_assignments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| group_id | uuid | FK to dispatch_groups (nullable) |
| direct_phone | text | Personal line number (nullable) |
| direct_subscriber_id | text | Personal subscriber ID (nullable) |
| is_default | boolean | Default line for this user |

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users) |
| signalwire_subscriber_id | text | User's SignalWire subscriber |
| status | text | 'available', 'busy', 'away', 'offline' |

---

## Ring Group Modes

### Parallel Ring (Current)
All dispatchers ring simultaneously. First to answer gets the call.

```javascript
connect: {
  parallel: [
    { to: '/private/alex' },
    { to: '/private/jordan' }
  ],
  timeout: 30
}
```

### Sequential Ring (Future)
Ring dispatchers one at a time in order.

```javascript
connect: {
  serial: [
    { to: '/private/alex', timeout: 15 },
    { to: '/private/jordan', timeout: 15 }
  ]
}
```

---

## Troubleshooting

### Call not connecting
1. Check SignalWire Resource is set to **Public**
2. Verify webhook URL is correct and accessible
3. Check Vercel function logs for errors

### Wrong caller ID showing
1. Ensure the caller ID number is verified in SignalWire
2. Check the phone number format is E.164 (e.g., `+16503946801`)

### Inbound calls not ringing dispatchers
1. Verify phone number is assigned to `dispatch-inbound` resource
2. Check dispatcher's `status` is 'available' in Supabase
3. Ensure `signalwire_subscriber_id` is set for each user

### View webhook logs
- Vercel: Dashboard → Project → Functions → Logs
- SignalWire: Dashboard → Debugger

---

## Deployment Commands

### Deploy Supabase Edge Function
```bash
supabase login
supabase functions deploy get-signalwire-token --project-ref wqybkkbfjvdwbtsuqoja
```

### Push to trigger Vercel deployment
```bash
git add -A
git commit -m "Update SWML webhooks"
git push
```

