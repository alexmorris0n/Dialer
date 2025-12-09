# Edge Function Deployed! ✅

## Function Details
- **Name**: `get-signalwire-token`
- **Version**: 1
- **Status**: ACTIVE
- **Endpoint**: `https://wqybkkbfjvdwbtsuqoja.supabase.co/functions/v1/get-signalwire-token`

## ⚠️ Required: Set Environment Secrets

The edge function needs SignalWire credentials. You need to add these secrets in Supabase:

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/wqybkkbfjvdwbtsuqoja/settings/functions
2. Click on "Edge Functions" → "Secrets"
3. Add these three secrets:

```
SIGNALWIRE_PROJECT_ID=your-signalwire-project-id
SIGNALWIRE_API_TOKEN=your-signalwire-api-token
SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
```

### Method 2: Using Supabase CLI

```bash
supabase secrets set SIGNALWIRE_PROJECT_ID=your-project-id --project-ref wqybkkbfjvdwbtsuqoja
supabase secrets set SIGNALWIRE_API_TOKEN=your-api-token --project-ref wqybkkbfjvdwbtsuqoja
supabase secrets set SIGNALWIRE_SPACE_URL=yourspace.signalwire.com --project-ref wqybkkbfjvdwbtsuqoja
```

## How It Works

1. User signs in with Google → gets Supabase session
2. Frontend calls `supabase.functions.invoke('get-signalwire-token')`
3. Edge function:
   - Verifies Supabase session
   - Checks if user has SignalWire Subscriber ID
   - If not, creates Subscriber via SignalWire API
   - Generates Subscriber token (1 hour TTL)
   - Returns token to frontend
4. Frontend uses token to initialize SignalWire Browser SDK

## Testing the Function

Once secrets are set, you can test it with:

```bash
curl -i --location --request POST \
  'https://wqybkkbfjvdwbtsuqoja.supabase.co/functions/v1/get-signalwire-token' \
  --header 'Authorization: Bearer YOUR_SUPABASE_SESSION_TOKEN' \
  --header 'Content-Type: application/json'
```

## Next Steps

1. **Get SignalWire credentials** from your SignalWire account:
   - Project ID
   - API Token
   - Space URL

2. **Add secrets** to Supabase (Method 1 above)

3. **Test the auth flow** - Sign in with Google and verify the edge function works

Let me know once you've added the SignalWire secrets!

