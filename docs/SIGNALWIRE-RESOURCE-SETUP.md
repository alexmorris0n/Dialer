# SignalWire Dashboard Resource Setup

This document describes how to configure SignalWire Resources for the SWML-based dialer architecture.

## Prerequisites

- SignalWire account with a Space
- At least one phone number purchased
- Vercel app deployed with `/api/swml-outbound` and `/api/swml-inbound` endpoints

## Resource 1: Outbound Calls (dispatch-outbound)

This resource handles outbound calls from dispatchers with dynamic caller ID.

### Setup Steps

1. **Navigate to Resources**
   - Go to your SignalWire Dashboard
   - Click "Resources" in the left sidebar
   - Click "+ Add Resource"

2. **Create SWML Script Resource**
   - Name: `dispatch-outbound`
   - Type: Select "SWML Script" or "Webhook"

3. **Configure Address**
   - Context: `public`
   - Name: `dispatch-outbound`
   - Full address will be: `/public/dispatch-outbound`

4. **Set Webhook URL**
   - URL: `https://your-app.vercel.app/api/swml-outbound`
   - Method: POST
   - Content-Type: application/json

5. **Save the Resource**

### How It Works

When a browser calls `client.dial({ to: '/public/dispatch-outbound', userVariables: {...} })`:

1. SignalWire receives the dial request
2. SignalWire makes HTTP POST to your webhook URL with call data + userVariables
3. Your webhook returns SWML JSON with `connect` statement
4. SignalWire executes the SWML, connecting browser WebRTC to PSTN
5. The `from` in the connect statement sets the outbound caller ID

---

## Resource 2: Inbound Calls (dispatch-inbound)

This resource handles inbound calls with ring group functionality.

### Setup Steps

1. **Navigate to Resources**
   - Go to your SignalWire Dashboard
   - Click "Resources" in the left sidebar
   - Click "+ Add Resource"

2. **Create SWML Script Resource**
   - Name: `dispatch-inbound`
   - Type: Select "SWML Script" or "Webhook"

3. **Configure Address**
   - Assign your dispatch phone number: `+16503946801`
   - This maps inbound calls to this number to this resource

4. **Set Webhook URL**
   - URL: `https://your-app.vercel.app/api/swml-inbound`
   - Method: POST
   - Content-Type: application/json

5. **Save the Resource**

### Alternative: Static SWML Script

Instead of a webhook, you can use a static SWML script in the dashboard:

```yaml
version: "1.0.0"
sections:
  main:
    - answer: {}
    - play:
        urls:
          - "silence:1.0"
    - connect:
        parallel:
          - to: "/private/dispatcher-alex"
          - to: "/private/dispatcher-jordan"
          - to: "/private/dispatcher-sam"
        timeout: 30
        ringback:
          ringtone: "us"
    - play:
        urls:
          - "say:We apologize, but no dispatchers are available. Please try again later."
    - hangup: {}
```

### How It Works

When a customer calls your dispatch number:

1. SignalWire receives the inbound call
2. SignalWire looks up the Resource assigned to that phone number
3. SignalWire either runs static SWML or calls your webhook
4. SWML `connect` with `parallel` rings all dispatchers simultaneously
5. First dispatcher to answer gets connected to the customer

---

## Environment Variables

Set these in your Vercel dashboard (Settings → Environment Variables):

| Variable | Value | Description |
|----------|-------|-------------|
| `DEFAULT_CALLER_ID` | `+16503946801` | Fallback caller ID if none specified |
| `DISPATCHER_ADDRESSES` | `/private/dispatcher-alex,/private/dispatcher-jordan` | Comma-separated list of dispatcher subscriber addresses |

---

## Testing

### Test Outbound Webhook

```bash
curl -X POST https://your-app.vercel.app/api/swml-outbound \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "userVariables": {
        "destination": "+15551234567",
        "callerID": "+16503946801"
      }
    }
  }'
```

Expected response:
```json
{
  "version": "1.0.0",
  "sections": {
    "main": [
      {
        "connect": {
          "from": "+16503946801",
          "to": "+15551234567",
          "timeout": 60
        }
      }
    ]
  }
}
```

### Test Inbound Webhook

```bash
curl -X POST https://your-app.vercel.app/api/swml-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "from": "+15551234567",
      "to": "+16503946801"
    }
  }'
```

---

## Troubleshooting

### "uri_does_not_resolve_to_address" Error

This means the browser is trying to dial an address that doesn't exist as a Resource.

**Fix:** Ensure the Resource exists with the exact address `/public/dispatch-outbound`

### Caller ID Not Changing

1. Check that `userVariables` is being passed in `client.dial()`
2. Check webhook logs to see if `callerID` is received
3. Verify the SWML response includes the correct `from` value

### Ring Group Not Working

1. Verify dispatcher subscriber addresses exist (e.g., `/private/dispatcher-alex`)
2. Check that dispatchers are online (connected via Browser SDK)
3. Check webhook logs for errors

---

## Next Steps

After setting up Resources:

1. Deploy your Vercel app
2. Create the Resources in SignalWire Dashboard
3. Update your browser code to dial `/public/dispatch-outbound`
4. Test an outbound call
5. Test an inbound call to verify ring group

