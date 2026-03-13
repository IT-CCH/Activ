-- Enable global activities (available to all care homes)
-- Global activities are represented by activities.activities.care_home_id = NULL

ALTER TABLE activities.activities
  ALTER COLUMN care_home_id DROP NOT NULL;

-- Ensure the public view still reflects base table shape
CREATE OR REPLACE VIEW public.activities AS
SELECT * FROM activities.activities;

-- Ensure INSTEAD OF trigger mappings continue to support all fields while allowing nullable care_home_id
CREATE OR REPLACE FUNCTION public.activities_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activities%ROWTYPE;
BEGIN
  INSERT INTO activities.activities (
    care_home_id, category_id, name, description, objective,
    duration_minutes, max_participants, min_participants,
    status, location, equipment_required, materials_needed, instructions, benefits, image_url, created_by
  )
  VALUES (
    NEW.care_home_id, NEW.category_id, NEW.name, NEW.description, NEW.objective,
    NEW.duration_minutes, NEW.max_participants, NEW.min_participants,
    NEW.status, NEW.location, NEW.equipment_required, NEW.materials_needed, NEW.instructions, NEW.benefits, NEW.image_url, NEW.created_by
  )
  RETURNING * INTO inserted_row;

  NEW.id = inserted_row.id;
  NEW.created_at = inserted_row.created_at;
  NEW.updated_at = inserted_row.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    image_url = NEW.image_url,
    updated_at = NEW.updated_at,
    created_by = NEW.created_by
  WHERE id = OLD.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
