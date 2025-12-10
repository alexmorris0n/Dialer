-- Migration: Add dispatch groups and user assignments
-- Created: 2024-12-10
-- Purpose: Support flexible caller ID assignment per user/group

-- ============================================
-- DISPATCH GROUPS TABLE
-- Shared lines for groups of dispatchers
-- ============================================
CREATE TABLE dispatch_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,           -- Outbound caller ID for this group
  signalwire_subscriber_id TEXT,        -- Optional: shared subscriber for inbound
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_dispatch_groups_name ON dispatch_groups(name);

-- ============================================
-- USER ASSIGNMENTS TABLE
-- Flexible mapping of users to lines/groups
-- A user can have multiple assignments (e.g., Dispatch + own number)
-- ============================================
CREATE TABLE user_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Group assignment (nullable - user might only have direct line)
  group_id UUID REFERENCES dispatch_groups(id) ON DELETE CASCADE,
  
  -- Direct line assignment (nullable - user might only have group)
  direct_phone TEXT,                    -- User's own phone number
  direct_subscriber_id TEXT,            -- User's own SignalWire subscriber
  
  -- Which line to use by default
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Must have at least one of: group_id or direct_phone
  CONSTRAINT at_least_one_assignment CHECK (
    group_id IS NOT NULL OR direct_phone IS NOT NULL
  )
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX idx_user_assignments_group_id ON user_assignments(group_id);
CREATE INDEX idx_user_assignments_default ON user_assignments(user_id, is_default) WHERE is_default = TRUE;

-- Unique constraint: only one default per user
CREATE UNIQUE INDEX idx_user_assignments_single_default ON user_assignments(user_id) WHERE is_default = TRUE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE dispatch_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;

-- Dispatch groups: all authenticated users can view
CREATE POLICY "Users can view dispatch groups" ON dispatch_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- User assignments: users can view their own
CREATE POLICY "Users can view own assignments" ON user_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all (using service role key bypasses RLS)

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for dispatch_groups
CREATE TRIGGER dispatch_groups_updated_at
  BEFORE UPDATE ON dispatch_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at for user_assignments
CREATE TRIGGER user_assignments_updated_at
  BEFORE UPDATE ON user_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Create default dispatch group
INSERT INTO dispatch_groups (name, phone_number)
VALUES ('Dispatch', '+16503946801');

-- Note: User assignments should be created when users are added to groups
-- Example:
-- INSERT INTO user_assignments (user_id, group_id, is_default)
-- SELECT u.id, dg.id, TRUE
-- FROM users u, dispatch_groups dg
-- WHERE u.role = 'dispatcher' AND dg.name = 'Dispatch';

