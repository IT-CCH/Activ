-- Add thumbnail image column used by Activities page
-- IMPORTANT: public.activities is a VIEW. The real writable table is activities.activities.
ALTER TABLE activities.activities
ADD COLUMN IF NOT EXISTS image_url text;

-- Ensure extended activity detail columns exist
ALTER TABLE activities.activities
ADD COLUMN IF NOT EXISTS materials_needed text,
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS benefits text;

-- Ensure public.activities view exposes the new column from base table
CREATE OR REPLACE VIEW public.activities AS
SELECT * FROM activities.activities;

-- Ensure INSTEAD OF triggers propagate image_url for writes through the public view
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

-- Ensure INSTEAD OF delete handler exists and triggers are attached
CREATE OR REPLACE FUNCTION public.activities_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM activities.activities WHERE id = OLD.id;
	RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to the public.activities view
DROP TRIGGER IF EXISTS activities_instead_of_insert ON public.activities;
CREATE TRIGGER activities_instead_of_insert
INSTEAD OF INSERT ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_insert();

DROP TRIGGER IF EXISTS activities_instead_of_update ON public.activities;
CREATE TRIGGER activities_instead_of_update
INSTEAD OF UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_update();

DROP TRIGGER IF EXISTS activities_instead_of_delete ON public.activities;
CREATE TRIGGER activities_instead_of_delete
INSTEAD OF DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_delete();

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
