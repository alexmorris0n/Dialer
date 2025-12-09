-- Dispatcher Phone System - Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Links Google Auth to SignalWire Subscriber
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  
  -- SignalWire link
  signalwire_subscriber_id TEXT UNIQUE,
  
  -- Role determines UI (dispatcher sees queue, manager doesn't)
  role TEXT NOT NULL DEFAULT 'dispatcher' CHECK (role IN ('dispatcher', 'manager', 'admin')),
  
  -- Status for queue availability
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  
  -- Preferences (JSON for flexibility)
  preferences JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALLS TABLE
-- All call history with recordings/transcripts
-- ============================================
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- SignalWire identifiers
  signalwire_call_id TEXT UNIQUE NOT NULL,
  
  -- Who handled the call
  user_id UUID REFERENCES users(id),
  
  -- Call details
  caller_phone TEXT NOT NULL,
  callee_phone TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Queue info (if routed through queue)
  queue_name TEXT,
  wait_time_seconds INTEGER,
  
  -- Call outcome
  status TEXT CHECK (status IN ('completed', 'missed', 'voicemail', 'abandoned')),
  duration_seconds INTEGER,
  
  -- AI-generated content
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_caller_phone ON calls(caller_phone);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- ============================================
-- VOICEMAILS TABLE
-- Voicemails with transcription and read state
-- ============================================
CREATE TABLE voicemails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to call if applicable
  call_id UUID REFERENCES calls(id),
  
  -- Who the voicemail is for
  user_id UUID REFERENCES users(id),
  
  -- Caller info
  caller_phone TEXT NOT NULL,
  
  -- Content
  recording_url TEXT NOT NULL,
  transcript TEXT,
  duration_seconds INTEGER,
  
  -- State
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_voicemails_user_id ON voicemails(user_id);
CREATE INDEX idx_voicemails_is_read ON voicemails(is_read);

-- ============================================
-- SMS MESSAGES TABLE
-- SMS/MMS history
-- ============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- SignalWire identifier
  signalwire_message_id TEXT UNIQUE,
  
  -- Conversation grouping
  thread_id TEXT NOT NULL, -- Phone number for now, could be more complex
  
  -- Who handled (for outbound)
  user_id UUID REFERENCES users(id),
  
  -- Message details
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- MMS
  has_media BOOLEAN DEFAULT FALSE,
  media_urls TEXT[],
  
  -- Status
  status TEXT CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_thread_id ON sms_messages(thread_id);
CREATE INDEX idx_sms_created_at ON sms_messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Dispatchers can see all calls (team visibility)
CREATE POLICY "Team can view calls" ON calls
  FOR SELECT USING (TRUE);

-- Dispatchers can see all voicemails for their role
CREATE POLICY "Users can view own voicemails" ON voicemails
  FOR SELECT USING (user_id = auth.uid());

-- SMS visible to team
CREATE POLICY "Team can view SMS" ON sms_messages
  FOR SELECT USING (TRUE);

-- ============================================
-- SERVICE ROLE POLICIES (for webhooks)
-- Webhooks use service role key, bypass RLS
-- ============================================

-- No additional policies needed - service role bypasses RLS

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REALTIME
-- Enable realtime for live updates
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE voicemails;
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
