-- Create public view for activity_resources so it can be accessed via PostgREST browser client
-- (PostgREST only allows public and graphql_public schemas)

CREATE OR REPLACE VIEW public.activity_resources AS
SELECT * FROM activities.activity_resources;

-- INSTEAD OF INSERT trigger
CREATE OR REPLACE FUNCTION public.activity_resources_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activity_resources%ROWTYPE;
BEGIN
  INSERT INTO activities.activity_resources (
    care_home_id, activity_id, resource_name, resource_type,
    quantity_needed, quantity_available, unit_of_measure,
    reorder_level, cost_per_unit, notes, is_reusable
  )
  VALUES (
    NEW.care_home_id, NEW.activity_id, NEW.resource_name, NEW.resource_type,
    NEW.quantity_needed, NEW.quantity_available, NEW.unit_of_measure,
    NEW.reorder_level, NEW.cost_per_unit, NEW.notes, NEW.is_reusable
  )
  RETURNING * INTO inserted_row;

  NEW.id = inserted_row.id;
  NEW.created_at = inserted_row.created_at;
  NEW.updated_at = inserted_row.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTEAD OF UPDATE trigger
CREATE OR REPLACE FUNCTION public.activity_resources_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_resources SET
    care_home_id = NEW.care_home_id,
    activity_id = NEW.activity_id,
    resource_name = NEW.resource_name,
    resource_type = NEW.resource_type,
    quantity_needed = NEW.quantity_needed,
    quantity_available = NEW.quantity_available,
    unit_of_measure = NEW.unit_of_measure,
    reorder_level = NEW.reorder_level,
    cost_per_unit = NEW.cost_per_unit,
    notes = NEW.notes,
    is_reusable = NEW.is_reusable,
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTEAD OF DELETE trigger
CREATE OR REPLACE FUNCTION public.activity_resources_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activity_resources WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire up triggers
DROP TRIGGER IF EXISTS activity_resources_insert_trigger ON public.activity_resources;
DROP TRIGGER IF EXISTS activity_resources_update_trigger ON public.activity_resources;
DROP TRIGGER IF EXISTS activity_resources_delete_trigger ON public.activity_resources;

CREATE TRIGGER activity_resources_insert_trigger
  INSTEAD OF INSERT ON public.activity_resources
  FOR EACH ROW EXECUTE FUNCTION public.activity_resources_instead_of_insert();

CREATE TRIGGER activity_resources_update_trigger
  INSTEAD OF UPDATE ON public.activity_resources
  FOR EACH ROW EXECUTE FUNCTION public.activity_resources_instead_of_update();

CREATE TRIGGER activity_resources_delete_trigger
  INSTEAD OF DELETE ON public.activity_resources
  FOR EACH ROW EXECUTE FUNCTION public.activity_resources_instead_of_delete();

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_resources TO authenticated;
GRANT SELECT ON public.activity_resources TO anon;
