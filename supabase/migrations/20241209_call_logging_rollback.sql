-- Rollback: Revert call logging changes

-- Remove policies
DROP POLICY IF EXISTS "Dispatchers can insert calls" ON calls;
DROP POLICY IF EXISTS "Dispatchers can update own calls" ON calls;

-- Revert status constraint
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_status_check 
  CHECK (status IN ('completed', 'missed', 'voicemail', 'abandoned'));

-- Make signalwire_call_id NOT NULL again (warning: this will fail if there are null values)
-- DELETE FROM calls WHERE signalwire_call_id IS NULL;
-- ALTER TABLE calls ALTER COLUMN signalwire_call_id SET NOT NULL;


