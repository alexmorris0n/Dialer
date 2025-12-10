-- Migration: Allow dispatchers to log their own calls
-- This enables per-user call tracking with a shared SignalWire subscriber

-- Make signalwire_call_id nullable (we might not have it immediately)
ALTER TABLE calls ALTER COLUMN signalwire_call_id DROP NOT NULL;

-- Add status options for in-progress calls
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_status_check 
  CHECK (status IN ('in_progress', 'completed', 'missed', 'voicemail', 'abandoned'));

-- Allow authenticated users to insert calls
CREATE POLICY "Dispatchers can insert calls" ON calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own calls (for ending calls)
CREATE POLICY "Dispatchers can update own calls" ON calls
  FOR UPDATE USING (auth.uid() = user_id);


