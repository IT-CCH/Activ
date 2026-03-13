-- Create views in public schema that point to activities schema tables
-- This allows the Supabase JS client to access them without custom schema configuration

-- View for activities table
CREATE OR REPLACE VIEW public.activities AS
SELECT * FROM activities.activities;

-- View for activity_categories table
CREATE OR REPLACE VIEW public.activity_categories AS
SELECT * FROM activities.activity_categories;

-- View for activity_media table
CREATE OR REPLACE VIEW public.activity_media AS
SELECT * FROM activities.activity_media;

-- Enable INSERT/UPDATE/DELETE on views using triggers
-- For activities view
CREATE OR REPLACE FUNCTION public.activities_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activities%ROWTYPE;
BEGIN
  INSERT INTO activities.activities (
    care_home_id, category_id, name, description, objective,
    duration_minutes, max_participants, min_participants,
    status, location, equipment_required, created_by
  )
  VALUES (
    NEW.care_home_id, NEW.category_id, NEW.name, NEW.description, NEW.objective,
    NEW.duration_minutes, NEW.max_participants, NEW.min_participants,
    NEW.status, NEW.location, NEW.equipment_required, NEW.created_by
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
    updated_at = NEW.updated_at,
    created_by = NEW.created_by
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.activities_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activities WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS activities_insert_trigger ON public.activities;
DROP TRIGGER IF EXISTS activities_update_trigger ON public.activities;
DROP TRIGGER IF EXISTS activities_delete_trigger ON public.activities;

CREATE TRIGGER activities_insert_trigger
  INSTEAD OF INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_insert();

CREATE TRIGGER activities_update_trigger
  INSTEAD OF UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_update();

CREATE TRIGGER activities_delete_trigger
  INSTEAD OF DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_instead_of_delete();

-- For activity_media view
CREATE OR REPLACE FUNCTION public.activity_media_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activity_media%ROWTYPE;
BEGIN
  INSERT INTO activities.activity_media (
    activity_id, care_home_id, media_type, title, tagline, description,
    file_path, file_name, file_size, mime_type, external_url,
    youtube_video_id, thumbnail_url, display_order, is_primary, created_by
  )
  VALUES (
    NEW.activity_id, NEW.care_home_id, NEW.media_type, NEW.title, NEW.tagline, NEW.description,
    NEW.file_path, NEW.file_name, NEW.file_size, NEW.mime_type, NEW.external_url,
    NEW.youtube_video_id, NEW.thumbnail_url, NEW.display_order, NEW.is_primary, NEW.created_by
  )
  RETURNING * INTO inserted_row;
  
  NEW.id = inserted_row.id;
  NEW.created_at = inserted_row.created_at;
  NEW.updated_at = inserted_row.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.activity_media_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_media SET
    activity_id = NEW.activity_id,
    care_home_id = NEW.care_home_id,
    media_type = NEW.media_type,
    title = NEW.title,
    tagline = NEW.tagline,
    description = NEW.description,
    file_path = NEW.file_path,
    file_name = NEW.file_name,
    file_size = NEW.file_size,
    mime_type = NEW.mime_type,
    external_url = NEW.external_url,
    youtube_video_id = NEW.youtube_video_id,
    thumbnail_url = NEW.thumbnail_url,
    display_order = NEW.display_order,
    is_primary = NEW.is_primary,
    updated_at = NEW.updated_at,
    created_by = NEW.created_by
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.activity_media_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activity_media WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS activity_media_insert_trigger ON public.activity_media;
DROP TRIGGER IF EXISTS activity_media_update_trigger ON public.activity_media;
DROP TRIGGER IF EXISTS activity_media_delete_trigger ON public.activity_media;

CREATE TRIGGER activity_media_insert_trigger
  INSTEAD OF INSERT ON public.activity_media
  FOR EACH ROW EXECUTE FUNCTION public.activity_media_instead_of_insert();

CREATE TRIGGER activity_media_update_trigger
  INSTEAD OF UPDATE ON public.activity_media
  FOR EACH ROW EXECUTE FUNCTION public.activity_media_instead_of_update();

CREATE TRIGGER activity_media_delete_trigger
  INSTEAD OF DELETE ON public.activity_media
  FOR EACH ROW EXECUTE FUNCTION public.activity_media_instead_of_delete();

-- For activity_categories view
CREATE OR REPLACE FUNCTION public.activity_categories_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activity_categories%ROWTYPE;
BEGIN
  INSERT INTO activities.activity_categories (care_home_id, name, description, created_by)
  VALUES (NEW.care_home_id, NEW.name, NEW.description, auth.uid())
  RETURNING * INTO inserted_row;
  
  NEW.id = inserted_row.id;
  NEW.created_at = inserted_row.created_at;
  NEW.updated_at = inserted_row.updated_at;
  NEW.color_code = inserted_row.color_code;
  NEW.is_active = inserted_row.is_active;
  NEW.created_by = inserted_row.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.activity_categories_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_categories SET
    care_home_id = NEW.care_home_id,
    name = NEW.name,
    description = NEW.description,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.activity_categories_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activity_categories WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS activity_categories_insert_trigger ON public.activity_categories;
DROP TRIGGER IF EXISTS activity_categories_update_trigger ON public.activity_categories;
DROP TRIGGER IF EXISTS activity_categories_delete_trigger ON public.activity_categories;

CREATE TRIGGER activity_categories_insert_trigger
  INSTEAD OF INSERT ON public.activity_categories
  FOR EACH ROW EXECUTE FUNCTION public.activity_categories_instead_of_insert();

CREATE TRIGGER activity_categories_update_trigger
  INSTEAD OF UPDATE ON public.activity_categories
  FOR EACH ROW EXECUTE FUNCTION public.activity_categories_instead_of_update();

CREATE TRIGGER activity_categories_delete_trigger
  INSTEAD OF DELETE ON public.activity_categories
  FOR EACH ROW EXECUTE FUNCTION public.activity_categories_instead_of_delete();

-- Grant permissions on views
GRANT ALL ON public.activities TO authenticated;
GRANT ALL ON public.activity_categories TO authenticated;
GRANT ALL ON public.activity_media TO authenticated;
