-- Activity Media Table for storing media attachments related to activities
-- Supports: videos, photos, PDFs, PowerPoint, YouTube links, website links

CREATE TABLE IF NOT EXISTS activities.activity_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities.activities(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL,
  
  -- Media type: 'video', 'photo', 'pdf', 'powerpoint', 'youtube', 'website'
  media_type VARCHAR(50) NOT NULL,
  
  -- Title/name for the media
  title VARCHAR(255),
  
  -- Tagline for quick categorization (e.g., 'Beginner', 'Advanced', 'Light Exercise', 'Intensive')
  tagline VARCHAR(100),
  
  -- Description or notes about the media
  description TEXT,
  
  -- For uploaded files: storage path in Supabase storage
  file_path TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- For external links: YouTube URL or website URL
  external_url TEXT,
  
  -- YouTube specific: video ID for embedding
  youtube_video_id VARCHAR(50),
  
  -- Thumbnail URL (auto-generated for YouTube, can be custom for others)
  thumbnail_url TEXT,
  
  -- Display order for sorting
  display_order INTEGER DEFAULT 0,
  
  -- Whether this is the primary/featured media for the activity
  is_primary BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Create indexes for faster queries
CREATE INDEX idx_activity_media_activity_id ON activities.activity_media(activity_id);
CREATE INDEX idx_activity_media_care_home_id ON activities.activity_media(care_home_id);
CREATE INDEX idx_activity_media_type ON activities.activity_media(media_type);

-- Enable RLS
ALTER TABLE activities.activity_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
CREATE POLICY "Users can view activity media from their care home" ON activities.activity_media
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert activity media for their care home" ON activities.activity_media
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update activity media from their care home" ON activities.activity_media
  FOR UPDATE USING (TRUE);

CREATE POLICY "Users can delete activity media from their care home" ON activities.activity_media
  FOR DELETE USING (TRUE);

-- Create storage bucket for activity media (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('activity-media', 'activity-media', true);

-- Storage policies for activity-media bucket
-- These need to be run in the Supabase dashboard under Storage > Policies
/*
-- Allow authenticated users to upload files
CREATE POLICY "Allow uploads to activity-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-media');

-- Allow public read access
CREATE POLICY "Allow public read of activity-media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'activity-media');

-- Allow users to delete their own uploads
CREATE POLICY "Allow delete of activity-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'activity-media');
*/

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION activities.update_activity_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_media_updated_at
  BEFORE UPDATE ON activities.activity_media
  FOR EACH ROW
  EXECUTE FUNCTION activities.update_activity_media_updated_at();
