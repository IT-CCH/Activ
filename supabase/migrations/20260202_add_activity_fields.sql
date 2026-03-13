-- Add missing fields to activities table
-- These fields are used in the UI but were missing from the database

ALTER TABLE activities.activities 
ADD COLUMN IF NOT EXISTS materials_needed TEXT,
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS benefits TEXT;

-- Update the public view to include new fields
CREATE OR REPLACE VIEW public.activities AS
SELECT * FROM activities.activities;

-- Update the insert trigger function to handle new fields
CREATE OR REPLACE FUNCTION public.activities_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activities SET
    care_home_id = NEW.care_home_id,
    category_id = NEW.category_id,
    name = NEW.name,
    description = NEW.description,
    objective = NEW.objective,
    duration_minutes = NEW.duration_minutes,
    max_participants = NEW.max_participants,
    min_participants = NEW.min_participants,
    status = NEW.status,
    location = NEW.location,
    equipment_required = NEW.equipment_required,
    materials_needed = NEW.materials_needed,
    instructions = NEW.instructions,
    benefits = NEW.benefits,
    updated_at = NEW.updated_at,
    created_by = NEW.created_by
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
