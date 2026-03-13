import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './AppIcon';
import supabase from '../services/supabaseClient';

const MusicLibraryModal = ({ isOpen, onClose, onSelectPlaylist, currentPlaylistId }) => {
  const [activeTab, setActiveTab] = useState('songs'); // 'songs', 'playlists', 'upload'
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [playlistViewMode, setPlaylistViewMode] = useState('grid'); // 'grid' or 'list'
  const [viewingPlaylist, setViewingPlaylist] = useState(null); // For detailed playlist view
  const [viewingPlaylistSongs, setViewingPlaylistSongs] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'artist', 'duration', 'date'
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Fetch songs and playlists
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (songsError) throw songsError;
      setSongs(songsData || []);

      // Fetch playlists with song count
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_songs(count)
        `)
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;
      setPlaylists(playlistsData || []);
    } catch (error) {
      console.error('Error fetching music data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch songs for a specific playlist
  const fetchPlaylistSongs = useCallback(async (playlistId) => {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select(`
          *,
          songs(*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;
      setPlaylistSongs(data?.map(ps => ps.songs) || []);
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
    }
  }, []);

  // Fetch songs for viewing a playlist in detail
  const fetchViewingPlaylistSongs = useCallback(async (playlistId) => {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select(`
          *,
          songs(*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;
      setViewingPlaylistSongs(data?.map(ps => ps.songs).filter(s => s) || []);
    } catch (error) {
      console.error('Error fetching viewing playlist songs:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (editingPlaylist) {
      fetchPlaylistSongs(editingPlaylist.id);
    }
  }, [editingPlaylist, fetchPlaylistSongs]);

  useEffect(() => {
    if (viewingPlaylist) {
      fetchViewingPlaylistSongs(viewingPlaylist.id);
    }
  }, [viewingPlaylist, fetchViewingPlaylistSongs]);

  // Sort songs helper
  const getSortedSongs = (songList) => {
    return [...songList].sort((a, b) => {
      switch (sortBy) {
        case 'artist':
          return (a.artist || '').localeCompare(b.artist || '');
        case 'duration':
          return (a.duration || 0) - (b.duration || 0);
        case 'date':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });
  };

  // Get total duration of songs
  const getTotalDuration = (songList) => {
    const totalSeconds = songList.reduce((acc, song) => acc + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);

    const uploadedSongs = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        console.warn(`Skipping non-audio file: ${file.name}`);
        continue;
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('songs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get audio duration (optional - requires loading audio)
        let duration = null;
        try {
          duration = await getAudioDuration(file);
        } catch (e) {
          console.warn('Could not get audio duration:', e);
        }

        // Extract song name and artist from filename
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        let songName = nameWithoutExt;
        let artist = 'Unknown Artist';
        
        // Try to parse "Artist - Song" format
        if (nameWithoutExt.includes(' - ')) {
          const parts = nameWithoutExt.split(' - ');
          artist = parts[0].trim();
          songName = parts.slice(1).join(' - ').trim();
        }

        // Insert song record
        const { data: songData, error: songError } = await supabase
          .from('songs')
          .insert({
            name: songName,
            artist: artist,
            duration: duration ? Math.floor(duration) : null,
            file_path: uploadData.path,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (songError) throw songError;
        uploadedSongs.push(songData);

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }

      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    // Refresh songs list
    await fetchData();
    setUploading(false);
    setUploadProgress(0);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Show success message
    if (uploadedSongs.length > 0) {
      showToast(`✅ Successfully uploaded ${uploadedSongs.length} song${uploadedSongs.length > 1 ? 's' : ''}!`, 'success');
      setActiveTab('songs'); // Switch to songs tab to see uploaded songs
    } else {
      showToast('❌ No songs were uploaded. Please try again.', 'error');
    }
  };

  // Get audio duration helper
  const getAudioDuration = (file) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = reject;
      audio.src = URL.createObjectURL(file);
    });
  };

  // Create new playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add selected songs to playlist if any
      if (selectedSongs.length > 0) {
        const playlistSongsInsert = selectedSongs.map((songId, index) => ({
          playlist_id: data.id,
          song_id: songId,
          position: index
        }));

        await supabase.from('playlist_songs').insert(playlistSongsInsert);
      }

      await fetchData();
      setShowNewPlaylistForm(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedSongs([]);
      showToast(`🎵 Playlist "${data.name}" created successfully!`, 'success');
    } catch (error) {
      console.error('Error creating playlist:', error);
      showToast('❌ Failed to create playlist. Please try again.', 'error');
    }
  };

  // Delete song
  const handleDeleteSong = async (song) => {
    if (!confirm(`Delete "${song.name}"? This cannot be undone.`)) return;

    try {
      // Delete from storage
      await supabase.storage.from('songs').remove([song.file_path]);

      // Delete from database (cascade will handle playlist_songs)
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', song.id);

      if (error) throw error;
      await fetchData();
      showToast(`🗑️ Song "${song.name}" deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting song:', error);
      showToast('❌ Failed to delete song. Please try again.', 'error');
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlist) => {
    if (!confirm(`Delete playlist "${playlist.name}"? Songs will not be deleted.`)) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlist.id);

      if (error) throw error;
      await fetchData();
      if (editingPlaylist?.id === playlist.id) {
        setEditingPlaylist(null);
      }
      showToast(`🗑️ Playlist "${playlist.name}" deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      showToast('❌ Failed to delete playlist. Please try again.', 'error');
    }
  };

  // Add songs to playlist
  const handleAddSongsToPlaylist = async (playlistId) => {
    if (!selectedSongs.length) return;

    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const startPosition = existing?.length ? existing[0].position + 1 : 0;

      const playlistSongsInsert = selectedSongs.map((songId, index) => ({
        playlist_id: playlistId,
        song_id: songId,
        position: startPosition + index
      }));

      await supabase.from('playlist_songs').upsert(playlistSongsInsert, { 
        onConflict: 'playlist_id,song_id' 
      });

      await fetchData();
      if (editingPlaylist?.id === playlistId) {
        await fetchPlaylistSongs(playlistId);
      }
      showToast(`➕ Added ${selectedSongs.length} song${selectedSongs.length > 1 ? 's' : ''} to playlist!`, 'success');
      setSelectedSongs([]);
    } catch (error) {
      console.error('Error adding songs to playlist:', error);
      showToast('❌ Failed to add songs to playlist.', 'error');
    }
  };

  // Remove song from playlist
  const handleRemoveSongFromPlaylist = async (songId) => {
    if (!editingPlaylist) return;

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', editingPlaylist.id)
        .eq('song_id', songId);

      if (error) throw error;
      await fetchPlaylistSongs(editingPlaylist.id);
      await fetchData();
      showToast('➖ Song removed from playlist', 'success');
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      showToast('❌ Failed to remove song from playlist.', 'error');
    }
  };

  // Play/Preview song
  const handlePlaySong = async (song) => {
    try {
      if (currentlyPlaying === song.id) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setCurrentlyPlaying(null);
        return;
      }

      const { data } = await supabase.storage
        .from('songs')
        .createSignedUrl(song.file_path, 3600);

      if (data?.signedUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(data.signedUrl);
        audioRef.current.play();
        audioRef.current.onended = () => setCurrentlyPlaying(null);
        setCurrentlyPlaying(song.id);
      }
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter songs by search
  const filteredSongs = songs.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle song selection
  const toggleSongSelection = (songId) => {
    setSelectedSongs(prev => 
      prev.includes(songId) 
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Toast Notification */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${
                toast.type === 'success' 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' 
                  : toast.type === 'error'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                toast.type === 'success' ? 'bg-white/20' : toast.type === 'error' ? 'bg-white/20' : 'bg-white/20'
              }`}>
                <Icon 
                  name={toast.type === 'success' ? 'CheckCircle' : toast.type === 'error' ? 'XCircle' : 'Info'} 
                  size={24} 
                />
              </div>
              <div>
                <p className="font-semibold text-lg">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast({ show: false, message: '', type: 'success' })}
                className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon name="Music" size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Music Library</h2>
                <p className="text-purple-200 text-sm">Upload and manage your songs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Icon name="X" size={24} className="text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 py-3 border-b border-gray-200 flex gap-2">
            {[
              { id: 'songs', icon: 'Music', label: 'All Songs' },
              { id: 'playlists', icon: 'ListMusic', label: 'Playlists' },
              { id: 'upload', icon: 'Upload', label: 'Upload' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {tab.id === 'songs' && songs.length > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {songs.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Songs Tab */}
                {activeTab === 'songs' && (
                  <div className="space-y-4">
                    {/* Search and Actions */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Icon name="Search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search songs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      {selectedSongs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{selectedSongs.length} selected</span>
                          <button
                            onClick={() => setShowNewPlaylistForm(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                          >
                            <Icon name="Plus" size={18} />
                            Create Playlist
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Songs List */}
                    {filteredSongs.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <Icon name="Music" size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">No songs uploaded yet</p>
                        <p className="text-gray-500 text-sm mt-1">Upload some music to get started</p>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Upload Songs
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredSongs.map((song, index) => (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                              selectedSongs.includes(song.id)
                                ? 'bg-purple-50 border-purple-300'
                                : 'bg-white border-gray-200 hover:border-purple-200'
                            }`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleSongSelection(song.id)}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                selectedSongs.includes(song.id)
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'border-gray-300 hover:border-purple-400'
                              }`}
                            >
                              {selectedSongs.includes(song.id) && (
                                <Icon name="Check" size={14} className="text-white" />
                              )}
                            </button>

                            {/* Play Button */}
                            <button
                              onClick={() => handlePlaySong(song)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                currentlyPlaying === song.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                              }`}
                            >
                              <Icon name={currentlyPlaying === song.id ? 'Pause' : 'Play'} size={18} />
                            </button>

                            {/* Song Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{song.name}</p>
                              <p className="text-sm text-gray-500 truncate">{song.artist || 'Unknown Artist'}</p>
                            </div>

                            {/* Duration */}
                            <span className="text-sm text-gray-500 font-mono">
                              {formatDuration(song.duration)}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSong(song)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete song"
                              >
                                <Icon name="Trash2" size={18} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Playlists Tab */}
                {activeTab === 'playlists' && !viewingPlaylist && (
                  <div className="space-y-4">
                    {/* Header with View Toggle */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setShowNewPlaylistForm(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Icon name="Plus" size={18} />
                        New Playlist
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{playlists.length} playlists</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setPlaylistViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${
                              playlistViewMode === 'grid' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title="Grid view"
                          >
                            <Icon name="Grid3X3" size={18} />
                          </button>
                          <button
                            onClick={() => setPlaylistViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${
                              playlistViewMode === 'list' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title="List view"
                          >
                            <Icon name="List" size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Playlists Empty State */}
                    {playlists.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                          <Icon name="ListMusic" size={40} className="text-purple-500" />
                        </div>
                        <p className="text-gray-800 font-semibold text-lg">No playlists yet</p>
                        <p className="text-gray-500 mt-1 mb-4">Create your first playlist to organize your music</p>
                        <button
                          onClick={() => setShowNewPlaylistForm(true)}
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
                        >
                          <Icon name="Plus" size={18} />
                          Create Playlist
                        </button>
                      </div>
                    ) : playlistViewMode === 'grid' ? (
                      /* Grid View */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {playlists.map((playlist, index) => (
                          <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                              currentPlaylistId === playlist.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300 bg-white'
                            }`}
                            onClick={() => setViewingPlaylist(playlist)}
                          >
                            {/* Playlist Cover */}
                            <div className="relative h-32 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center">
                              <div className="absolute inset-0 bg-black/10"></div>
                              <Icon name="Music" size={48} className="text-white/80 relative z-10" />
                              {currentPlaylistId === playlist.id && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                  <Icon name="Check" size={12} />
                                  Active
                                </div>
                              )}
                            </div>
                            
                            {/* Playlist Info */}
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-900 truncate">{playlist.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {playlist.playlist_songs?.[0]?.count || 0} songs
                              </p>
                              {playlist.description && (
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{playlist.description}</p>
                              )}
                            </div>

                            {/* Quick Actions (on hover) */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPlaylist(playlist);
                                    onClose();
                                  }}
                                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                >
                                  <Icon name="Play" size={14} />
                                  Use
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPlaylist(playlist);
                                  }}
                                  className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Edit playlist"
                                >
                                  <Icon name="Edit2" size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlaylist(playlist);
                                  }}
                                  className="p-2 bg-gray-100 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete playlist"
                                >
                                  <Icon name="Trash2" size={16} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      /* List View */
                      <div className="space-y-2">
                        {playlists.map((playlist, index) => (
                          <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                              currentPlaylistId === playlist.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300 bg-white'
                            }`}
                            onClick={() => setViewingPlaylist(playlist)}
                          >
                            {/* Playlist Icon */}
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <Icon name="Music" size={28} className="text-white" />
                            </div>
                            
                            {/* Playlist Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 truncate">{playlist.name}</h3>
                                {currentPlaylistId === playlist.id && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Active</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {playlist.playlist_songs?.[0]?.count || 0} songs
                              </p>
                              {playlist.description && (
                                <p className="text-xs text-gray-400 mt-1 truncate">{playlist.description}</p>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPlaylist(playlist);
                                  onClose();
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1"
                              >
                                <Icon name="Play" size={14} />
                                Use
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPlaylist(playlist);
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit playlist"
                              >
                                <Icon name="Edit2" size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlaylist(playlist);
                                }}
                                className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete playlist"
                              >
                                <Icon name="Trash2" size={18} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Playlist Detail View */}
                {activeTab === 'playlists' && viewingPlaylist && (
                  <div className="space-y-4">
                    {/* Back Button & Header */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setViewingPlaylist(null);
                          setViewingPlaylistSongs([]);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Icon name="ArrowLeft" size={24} className="text-gray-600" />
                      </button>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{viewingPlaylist.name}</h2>
                        <p className="text-gray-500">
                          {viewingPlaylistSongs.length} songs • {getTotalDuration(viewingPlaylistSongs)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onSelectPlaylist(viewingPlaylist);
                          onClose();
                        }}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <Icon name="Play" size={20} />
                        Use This Playlist
                      </button>
                    </div>

                    {/* Playlist Info Card */}
                    <div className="flex gap-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                      <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Icon name="Music" size={56} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{viewingPlaylist.name}</h3>
                        {viewingPlaylist.description && (
                          <p className="text-gray-600 mt-2">{viewingPlaylist.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Icon name="Music" size={16} />
                            {viewingPlaylistSongs.length} songs
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" size={16} />
                            {getTotalDuration(viewingPlaylistSongs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => setEditingPlaylist(viewingPlaylist)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-1"
                          >
                            <Icon name="Edit2" size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDeletePlaylist(viewingPlaylist);
                              setViewingPlaylist(null);
                            }}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <Icon name="Trash2" size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Songs</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort by:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="name">Name</option>
                          <option value="artist">Artist</option>
                          <option value="duration">Duration</option>
                          <option value="date">Date Added</option>
                        </select>
                      </div>
                    </div>

                    {/* Songs List */}
                    {viewingPlaylistSongs.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <Icon name="Music" size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No songs in this playlist</p>
                        <button
                          onClick={() => setEditingPlaylist(viewingPlaylist)}
                          className="mt-4 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm"
                        >
                          Add songs
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getSortedSongs(viewingPlaylistSongs).map((song, index) => (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                          >
                            {/* Track Number */}
                            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>

                            {/* Play Button */}
                            <button
                              onClick={() => handlePlaySong(song)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                currentlyPlaying === song.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                              }`}
                            >
                              <Icon name={currentlyPlaying === song.id ? 'Pause' : 'Play'} size={18} />
                            </button>

                            {/* Song Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{song.name}</p>
                              <p className="text-sm text-gray-500 truncate">{song.artist || 'Unknown Artist'}</p>
                            </div>

                            {/* Duration */}
                            <span className="text-sm text-gray-400 font-mono">
                              {formatDuration(song.duration)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="space-y-6">
                    {/* Upload Area */}
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                        uploading ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {uploading ? (
                        <div className="space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                            <div className="animate-spin">
                              <Icon name="Loader2" size={32} className="text-purple-600" />
                            </div>
                          </div>
                          <p className="text-lg font-medium text-purple-700">Uploading songs...</p>
                          <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-purple-600">{uploadProgress}% complete</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                            <Icon name="Upload" size={40} className="text-purple-600" />
                          </div>
                          <p className="text-xl font-medium text-gray-900 mb-2">Drop your audio files here</p>
                          <p className="text-gray-500 mb-4">or click to browse</p>
                          <p className="text-sm text-gray-400">Supports MP3, WAV, M4A, OGG, FLAC</p>
                        </>
                      )}
                    </div>

                    {/* Tips */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                        <Icon name="Info" size={18} />
                        Tips for organizing your music
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1 ml-6 list-disc">
                        <li>Name files as "Artist - Song Title" for auto-detection</li>
                        <li>Upload multiple files at once for batch processing</li>
                        <li>Create playlists to organize songs by mood or theme</li>
                        <li>Songs are stored securely in the cloud</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* New Playlist Modal */}
          <AnimatePresence>
            {showNewPlaylistForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setShowNewPlaylistForm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Playlist</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Playlist Name</label>
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="My Awesome Playlist"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                      <textarea
                        value={newPlaylistDescription}
                        onChange={(e) => setNewPlaylistDescription(e.target.value)}
                        placeholder="A collection of relaxing tunes..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>

                    {selectedSongs.length > 0 && (
                      <p className="text-sm text-purple-600">
                        {selectedSongs.length} song(s) will be added to this playlist
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowNewPlaylistForm(false);
                        setNewPlaylistName('');
                        setNewPlaylistDescription('');
                      }}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistName.trim()}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Playlist
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Playlist Modal */}
          <AnimatePresence>
            {editingPlaylist && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setEditingPlaylist(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Edit: {editingPlaylist.name}</h3>
                    <button
                      onClick={() => setEditingPlaylist(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  </div>

                  {/* Songs in Playlist */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 mb-2">Songs in playlist ({playlistSongs.length})</h4>
                    
                    {playlistSongs.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No songs in this playlist yet</p>
                    ) : (
                      playlistSongs.map((song, index) => (
                        <div
                          key={song.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{song.name}</p>
                            <p className="text-sm text-gray-500 truncate">{song.artist}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveSongFromPlaylist(song.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Icon name="Minus" size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Songs Section */}
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium text-gray-700 mb-3">Add songs to playlist</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {songs.filter(s => !playlistSongs.find(ps => ps.id === s.id)).map(song => (
                        <div
                          key={song.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                        >
                          <button
                            onClick={() => toggleSongSelection(song.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedSongs.includes(song.id)
                                ? 'bg-purple-600 border-purple-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedSongs.includes(song.id) && (
                              <Icon name="Check" size={12} className="text-white" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate text-sm">{song.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedSongs.length > 0 && (
                      <button
                        onClick={() => handleAddSongsToPlaylist(editingPlaylist.id)}
                        className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add {selectedSongs.length} song(s) to playlist
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MusicLibraryModal;
