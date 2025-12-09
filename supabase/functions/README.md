# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Dispatcher Phone System.

## Functions

### `get-signalwire-token`
Generates a SignalWire Subscriber token for authenticated users.

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/get-signalwire-token`

**Authentication:** Requires Supabase Auth Bearer token

**Response:**
```json
{
  "token": "eyJ...",
  "subscriber_id": "sub_abc123",
  "expires_at": "2025-01-15T12:00:00Z"
}
```

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
SIGNALWIRE_PROJECT_ID=your-project-id
SIGNALWIRE_API_TOKEN=your-api-token
SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
```

## Deployment

### Using Supabase CLI:

```bash
# Login
supabase login

# Link to project
supabase link --project-ref wqybkkbfjvdwbtsuqoja

# Deploy function
supabase functions deploy get-signalwire-token

# Set secrets
supabase secrets set SIGNALWIRE_PROJECT_ID=xxx
supabase secrets set SIGNALWIRE_API_TOKEN=xxx
supabase secrets set SIGNALWIRE_SPACE_URL=xxx.signalwire.com
```

### Using Supabase MCP:

The function can also be deployed using the Supabase MCP server tools.

## Testing Locally

```bash
# Serve functions locally
supabase functions serve

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/get-signalwire-token' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json'
```

## Usage in Frontend

```javascript
import { supabase } from '@/lib/supabase'

// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Call edge function
const { data, error } = await supabase.functions.invoke('get-signalwire-token', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})

if (error) {
  console.error('Error getting token:', error)
} else {
  const { token, subscriber_id, expires_at } = data
  // Use token to initialize SignalWire client
}
```

