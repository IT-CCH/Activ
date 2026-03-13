-- Songs table to store uploaded song metadata
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  duration INTEGER, -- duration in seconds
  file_path TEXT NOT NULL, -- path in Supabase storage
  file_size INTEGER, -- size in bytes
  mime_type VARCHAR(50),
  uploaded_by UUID REFERENCES auth.users(id),
  care_home_id UUID REFERENCES care_homes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  care_home_id UUID REFERENCES care_homes(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for playlist songs (many-to-many)
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- order in playlist
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_songs_care_home ON songs(care_home_id);
CREATE INDEX IF NOT EXISTS idx_songs_uploaded_by ON songs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_playlists_care_home ON playlists(care_home_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position);

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for songs
CREATE POLICY "Users can view songs from their care home" ON songs
  FOR SELECT USING (
    care_home_id IN (
      SELECT care_home_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload songs to their care home" ON songs
  FOR INSERT WITH CHECK (
    care_home_id IN (
      SELECT care_home_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their uploaded songs" ON songs
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- RLS Policies for playlists
CREATE POLICY "Users can view playlists from their care home" ON playlists
  FOR SELECT USING (
    care_home_id IN (
      SELECT care_home_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create playlists for their care home" ON playlists
  FOR INSERT WITH CHECK (
    care_home_id IN (
      SELECT care_home_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their playlists" ON playlists
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

CREATE POLICY "Users can delete their playlists" ON playlists
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- RLS Policies for playlist_songs
CREATE POLICY "Users can view playlist songs" ON playlist_songs
  FOR SELECT USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE care_home_id IN (
        SELECT care_home_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage playlist songs" ON playlist_songs
  FOR ALL USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE created_by = auth.uid()
    )
  );

-- Storage bucket for songs (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', false);

-- Storage policies for songs bucket
-- CREATE POLICY "Users can upload songs" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'songs' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can view songs" ON storage.objects
--   FOR SELECT USING (bucket_id = 'songs' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can delete their songs" ON storage.objects
--   FOR DELETE USING (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);
