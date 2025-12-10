-- Rollback: Remove dispatch groups and user assignments
-- Created: 2024-12-10
-- Purpose: Reverse the dispatch groups migration

-- Drop triggers first
DROP TRIGGER IF EXISTS user_assignments_updated_at ON user_assignments;
DROP TRIGGER IF EXISTS dispatch_groups_updated_at ON dispatch_groups;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_assignments_single_default;
DROP INDEX IF EXISTS idx_user_assignments_default;
DROP INDEX IF EXISTS idx_user_assignments_group_id;
DROP INDEX IF EXISTS idx_user_assignments_user_id;
DROP INDEX IF EXISTS idx_dispatch_groups_name;

-- Drop policies
DROP POLICY IF EXISTS "Users can view own assignments" ON user_assignments;
DROP POLICY IF EXISTS "Users can view dispatch groups" ON dispatch_groups;

-- Drop tables (user_assignments first due to foreign key)
DROP TABLE IF EXISTS user_assignments;
DROP TABLE IF EXISTS dispatch_groups;


