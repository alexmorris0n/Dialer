# API Endpoints

Vercel serverless functions in `/api/` directory.

## Auth Endpoints

### POST /api/softphone/token

Generates a SignalWire Subscriber token for authenticated user.

**Request:**
- Requires Supabase Auth session (cookie or Bearer token)

**Response:**
```json
{
  "token": "eyJ...",
  "subscriber_id": "sub_abc123",
  "expires_at": "2025-01-15T12:00:00Z"
}
```

**Logic:**
1. Verify Supabase session
2. Get user from Supabase `users` table
3. If no `signalwire_subscriber_id`:
   - Create Subscriber via SignalWire API
   - Store ID in Supabase
4. Generate Subscriber token via SignalWire API
5. Return token

---

## Webhook Endpoints

All webhooks receive POST from SignalWire. Use service role key for Supabase writes.

### POST /api/webhooks/call

Called when a call completes.

**SignalWire Payload (key fields):**
```json
{
  "call_id": "abc-123",
  "from": "+15551234567",
  "to": "+15559876543",
  "direction": "inbound",
  "duration": 180,
  "status": "completed",
  "queue_name": "dispatch",
  "wait_time": 45
}
```

**Action:**
Insert into `calls` table.

---

### POST /api/webhooks/recording

Called when recording is ready.

**SignalWire Payload:**
```json
{
  "call_id": "abc-123",
  "recording_url": "https://..."
}
```

**Action:**
Update `calls` table with `recording_url`.

---

### POST /api/webhooks/transcript

Called when transcription completes.

**SignalWire Payload:**
```json
{
  "call_id": "abc-123",
  "transcript": "Hello, I need to check on my ride..."
}
```

**Action:**
Update `calls` table with `transcript`.

---

### POST /api/webhooks/summary

Called when AI summary completes.

**SignalWire Payload:**
```json
{
  "call_id": "abc-123",
  "summary": "Customer called to check trip status for pickup at 3pm..."
}
```

**Action:**
Update `calls` table with `summary`.

---

### POST /api/webhooks/voicemail

Called when voicemail is left.

**SignalWire Payload:**
```json
{
  "call_id": "abc-123",
  "from": "+15551234567",
  "recording_url": "https://...",
  "transcript": "Hi, this is John...",
  "duration": 30
}
```

**Action:**
Insert into `voicemails` table.

---

### POST /api/webhooks/sms

Called when SMS is received.

**SignalWire Payload:**
```json
{
  "message_id": "msg-123",
  "from": "+15551234567",
  "to": "+15559876543",
  "body": "Where is my driver?",
  "media_urls": []
}
```

**Action:**
Insert into `sms_messages` table with `direction: 'inbound'`.

---

## SMS Endpoints

### POST /api/sms/send

Send an outbound SMS.

**Request:**
```json
{
  "to": "+15551234567",
  "body": "Your driver is 5 minutes away",
  "media_urls": []  // Optional for MMS
}
```

**Response:**
```json
{
  "message_id": "msg-456",
  "status": "sent"
}
```

**Logic:**
1. Verify Supabase session
2. Send via SignalWire Messaging API
3. Insert into `sms_messages` with `direction: 'outbound'`
4. Return result

---

## Queue Endpoints (optional, for dashboard)

### GET /api/queue/status

Get current queue stats.

**Response:**
```json
{
  "queue_name": "dispatch",
  "callers_waiting": 3,
  "longest_wait_seconds": 150,
  "available_agents": 2
}
```

**Note:** May be able to get this directly from Browser SDK instead of API call.

---

## File Structure

```
api/
├── softphone/
│   └── token.js          # Generate SignalWire token
├── webhooks/
│   ├── call.js           # Call completed
│   ├── recording.js      # Recording ready
│   ├── transcript.js     # Transcription complete
│   ├── summary.js        # Summary complete
│   ├── voicemail.js      # Voicemail received
│   └── sms.js            # SMS received
├── sms/
│   └── send.js           # Send outbound SMS
└── queue/
    └── status.js         # Queue stats (optional)
```
