# Supabase Setup - COMPLETE ✅

## Project Details

- **Project Name**: Dialer
- **Project ID**: wqybkkbfjvdwbtsuqoja
- **Region**: us-west-2
- **Status**: ACTIVE_HEALTHY
- **URL**: https://wqybkkbfjvdwbtsuqoja.supabase.co

## Database Schema Applied ✅

All tables created successfully with Row Level Security enabled:

### 1. `users` table
- Links Google Auth (auth.users) to SignalWire Subscriber ID
- Columns: id, email, name, signalwire_subscriber_id, role, status, preferences
- RLS: Users can view/update their own profile

### 2. `calls` table
- Call history with recordings, transcripts, summaries
- Columns: signalwire_call_id, user_id, caller_phone, direction, queue_name, wait_time_seconds, recording_url, transcript, summary, timestamps
- RLS: Team can view all calls (team visibility)
- Indexed on: user_id, caller_phone, created_at

### 3. `voicemails` table
- Voicemails with transcription and read state
- Columns: call_id, user_id, caller_phone, recording_url, transcript, is_read
- RLS: Users can view own voicemails

### 4. `sms_messages` table
- SMS/MMS history
- Columns: signalwire_message_id, thread_id, user_id, from_phone, to_phone, body, direction, has_media, media_urls
- RLS: Team can view all SMS
- Indexed on: thread_id, created_at

## Realtime Subscriptions Enabled ✅

- `calls` - Live call updates
- `voicemails` - Live voicemail notifications
- `sms_messages` - Live SMS updates

## Environment Variables Set ✅

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=https://wqybkkbfjvdwbtsuqoja.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Next: Enable Google Auth Provider

Go to Supabase Dashboard:
1. Navigate to: https://supabase.com/dashboard/project/wqybkkbfjvdwbtsuqoja/auth/providers
2. Enable **Google** provider
3. Configure OAuth:
   - Get Client ID and Secret from Google Cloud Console
   - Add authorized redirect URI: `https://wqybkkbfjvdwbtsuqoja.supabase.co/auth/v1/callback`

## Ready for Phase 1B! ✅

With Supabase fully configured, you can now proceed to:
- Implement `useAuth.js` composable
- Build Google sign-in flow
- Create Vercel function for SignalWire token generation

See `docs/BUILD-SEQUENCE.md` Phase 1B for next steps.

