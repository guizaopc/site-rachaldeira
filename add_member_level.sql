-- Add level column to members table
ALTER TABLE members 
ADD COLUMN level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5);

-- Update existing members to have default level 3 (average) if desired, or keep default 1
-- Let's set existing ones to 3 to be safe as "average" players, or 1?
-- User said "hidden level", usually defaults are average. Let's stick to 1 or 3.
-- Safest is 3 (mid-tier) so they don't get matched with beginners if they are pros, or pros if they are beginners.
-- Actually, let's just default to 1 as per schema default.
-- But for existing data, let's update them to 1.

COMMENT ON COLUMN members.level IS 'Skill level of the player (1-5) used for balancing teams';
