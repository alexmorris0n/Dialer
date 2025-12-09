# SignalWire Reference

Quick reference for SignalWire APIs used in this project.

## Key Concepts

### Call Fabric
SignalWire's unified platform for voice, video, messaging. Uses "Resources" architecture.
- **Subscribers**: User identities that can make/receive calls
- **Queues**: Hold callers, distribute to available Subscribers
- **SWML**: SignalWire Markup Language for call flows

### Browser SDK
JavaScript SDK for WebRTC calling from browser.
- Package: `@signalwire/js`
- Connects as a Subscriber
- Handles audio, call state, queue membership

---

## Subscribers API

### Create Subscriber
```
POST https://{space}.signalwire.com/api/fabric/subscribers

Headers:
  Authorization: Basic {base64(project_id:api_token)}
  Content-Type: application/json

Body:
{
  "email": "dispatcher@company.com",
  "first_name": "Alex",
  "last_name": "Dispatcher",
  "display_name": "Alex D",
  "job_title": "Dispatcher"
}

Response:
{
  "id": "sub_abc123...",
  "email": "dispatcher@company.com",
  ...
}
```

### Generate Subscriber Token
```
POST https://{space}.signalwire.com/api/fabric/subscribers/{subscriber_id}/tokens

Headers:
  Authorization: Basic {base64(project_id:api_token)}
  Content-Type: application/json

Body:
{
  "ttl": 3600  // Token lifetime in seconds
}

Response:
{
  "token": "eyJ...",
  "expires_at": "2025-01-15T12:00:00Z"
}
```

### List Subscribers
```
GET https://{space}.signalwire.com/api/fabric/subscribers

Headers:
  Authorization: Basic {base64(project_id:api_token)}
```

---

## Browser SDK

### Installation
```bash
npm install @signalwire/js
```

### Basic Setup
```javascript
import { SignalWire } from '@signalwire/js'

// Initialize client with Subscriber token
const client = await SignalWire({
  token: 'subscriber_token_from_backend'
})

// Listen for incoming calls
client.on('call.received', (call) => {
  // Show incoming call UI
  // call.answer() or call.hangup()
})
```

### Making Outbound Calls
```javascript
const call = await client.dial({
  to: '+15551234567',
  nodeId: 'your-resource-id'  // The phone resource
})

call.on('answered', () => {
  console.log('Call connected')
})

call.on('ended', () => {
  console.log('Call ended')
})
```

### Answering Inbound Calls
```javascript
client.on('call.received', async (call) => {
  // Show UI, then:
  await call.answer()
  
  // Or reject:
  await call.hangup()
})
```

### Call Controls
```javascript
// Mute/unmute
await call.audioMute()
await call.audioUnmute()

// Hold (if supported)
await call.hold()
await call.unhold()

// Hang up
await call.hangup()

// Send DTMF
await call.sendDigits('123')
```

### Queue Membership
```javascript
// Join queue to receive calls
await client.online({
  queues: ['dispatch-queue']
})

// Go offline (stop receiving from queue)
await client.offline()
```

---

## SWML (IVR Logic)

### Basic IVR Structure
```yaml
version: 1.0.0
sections:
  main:
    - play:
        url: "say:Thanks for calling. How can I help you?"
    - gather:
        input: [speech]
        timeout: 5
        speech_hints: [dispatch, accounting, sales, HR]
    - switch:
        variable: gather.speech
        cases:
          dispatch:
            - transfer:
                dest: "queue:dispatch-queue"
          accounting:
            - transfer:
                dest: "sip:accounting@company.sip.signalwire.com"
          sales:
            - transfer:
                dest: "sip:sales@company.sip.signalwire.com"
          default:
            - transfer:
                dest: "queue:dispatch-queue"
```

### Enable Recording + Transcription
```yaml
version: 1.0.0
sections:
  main:
    - answer
    - record:
        stereo: true
        action:
          - live_transcribe:
              provider: signalwire
              action:
                - summarize:
                    provider: signalwire
    - transfer:
        dest: "queue:dispatch-queue"
```

### live_transcribe Method
```yaml
- live_transcribe:
    provider: signalwire
    language: en-US
    action:
      - summarize:
          provider: signalwire
```

Sends webhook when transcription/summary complete.

---

## Messaging API

### Send SMS
```
POST https://{space}.signalwire.com/api/messaging/messages

Headers:
  Authorization: Basic {base64(project_id:api_token)}
  Content-Type: application/json

Body:
{
  "from": "+15559876543",  // Your SignalWire number
  "to": "+15551234567",
  "body": "Your driver is 5 minutes away"
}
```

### Send MMS
```json
{
  "from": "+15559876543",
  "to": "+15551234567",
  "body": "Here's your receipt",
  "media_urls": ["https://example.com/receipt.pdf"]
}
```

### Webhook for Inbound SMS
Configure in SignalWire dashboard. Receives POST with:
```json
{
  "message_id": "msg-123",
  "from": "+15551234567",
  "to": "+15559876543",
  "body": "Message text",
  "media_urls": ["https://..."]  // If MMS
}
```

---

## Queues

### Create Queue (Dashboard or API)
```
POST https://{space}.signalwire.com/api/fabric/resources

Body:
{
  "type": "queue",
  "name": "dispatch-queue",
  "settings": {
    "max_wait_time": 300,
    "music_on_hold": "default"
  }
}
```

### Queue Distribution
- Subscribers join queue via `client.online({ queues: ['dispatch-queue'] })`
- Calls routed to queue ring available Subscribers
- First to answer gets the call

---

## Webhook Configuration

In SignalWire Dashboard, set webhook URLs for:

| Event | URL |
|-------|-----|
| Call Status | https://yourapp.vercel.app/api/webhooks/call |
| Recording Ready | https://yourapp.vercel.app/api/webhooks/recording |
| Transcription | https://yourapp.vercel.app/api/webhooks/transcript |
| Message Received | https://yourapp.vercel.app/api/webhooks/sms |

---

## Environment Variables Needed

```
SIGNALWIRE_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SIGNALWIRE_API_TOKEN=PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
SIGNALWIRE_PHONE_NUMBER=+15559876543
```

---

## Useful Links

- [Call Fabric Overview](https://developer.signalwire.com/platform/call-fabric/)
- [Subscribers](https://developer.signalwire.com/platform/call-fabric/subscribers/)
- [Browser SDK](https://developer.signalwire.com/sdks/browser-sdk/)
- [SWML Reference](https://developer.signalwire.com/swml/)
- [live_transcribe](https://developer.signalwire.com/swml/methods/live_transcribe/)
- [action.summarize](https://developer.signalwire.com/swml/methods/live_transcribe/action/summarize/)
- [Messaging API](https://developer.signalwire.com/compatibility-api/guides/messaging/)
