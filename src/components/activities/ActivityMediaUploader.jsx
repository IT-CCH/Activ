import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../AppIcon';
import supabase from '../../services/supabaseClient';

const MEDIA_TYPES = [
  { id: 'video', label: 'Guided Video', icon: 'Video', accept: 'video/*', description: 'Upload a video file or add YouTube link' },
  { id: 'photo', label: 'Photo', icon: 'Image', accept: 'image/*', description: 'Upload images related to the activity' },
  { id: 'pdf', label: 'PDF Document', icon: 'FileText', accept: '.pdf', description: 'Upload PDF guides or instructions' },
  { id: 'powerpoint', label: 'PowerPoint', icon: 'Presentation', accept: '.ppt,.pptx,.odp', description: 'Upload presentation slides' },
  { id: 'youtube', label: 'YouTube Link', icon: 'Youtube', accept: null, description: 'Add YouTube video links' },
  { id: 'website', label: 'Website Link', icon: 'Link', accept: null, description: 'Add related website links' },
];

// Extract YouTube video ID from various URL formats
const extractYouTubeId = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1).split('?')[0];
    }
    if (urlObj.searchParams.get('v')) {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.pathname.includes('/embed/')) {
      return urlObj.pathname.split('/embed/')[1].split('?')[0];
    }
  } catch (e) {
    // Try regex for edge cases
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }
  return null;
};

const ActivityMediaUploader = ({ 
  careHomeId, 
  activityId = null, // null when creating new activity
  existingMedia = [], 
  onMediaChange,
  compact = false 
}) => {
  const [activeTab, setActiveTab] = useState('video');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaItems, setMediaItems] = useState([]);
  const [linkInput, setLinkInput] = useState({ url: '', title: '', tagline: '', description: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [error, setError] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize media items from existingMedia prop
  useEffect(() => {
    setMediaItems(existingMedia || []);
  }, [existingMedia]);

  const activeType = MEDIA_TYPES.find(t => t.id === activeTab);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${careHomeId}/${activeTab}/${fileName}`;

        // Upload to Supabase storage
        const { data, error: uploadError } = await supabase.storage
          .from('activity-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('activity-media')
          .getPublicUrl(filePath);

        // Create media item
        const newItem = {
          id: `temp_${Date.now()}_${i}`,
          media_type: activeTab,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          tagline: '',
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          external_url: urlData.publicUrl,
          thumbnail_url: activeTab === 'photo' ? urlData.publicUrl : null,
          display_order: mediaItems.length + i,
          is_primary: mediaItems.length === 0 && i === 0,
        };

        setMediaItems(prev => {
          const updated = [...prev, newItem];
          onMediaChange?.(updated);
          return updated;
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle link submission (YouTube or Website)
  const handleLinkSubmit = () => {
    if (!linkInput.url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError(null);
    
    let newItem = {
      id: `temp_${Date.now()}`,
      media_type: activeTab,
      title: linkInput.title || (activeTab === 'youtube' ? 'YouTube Video' : 'Website Link'),
      tagline: linkInput.tagline || '',
      description: linkInput.description,
      external_url: linkInput.url.trim(),
      display_order: mediaItems.length,
      is_primary: mediaItems.length === 0,
    };

    // Extract YouTube ID if it's a YouTube link
    if (activeTab === 'youtube') {
      const videoId = extractYouTubeId(linkInput.url);
      if (!videoId) {
        setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
        return;
      }
      newItem.youtube_video_id = videoId;
      newItem.thumbnail_url = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    setMediaItems(prev => {
      const updated = [...prev, newItem];
      onMediaChange?.(updated);
      return updated;
    });

    setLinkInput({ url: '', title: '', tagline: '', description: '' });
    setShowLinkForm(false);
  };

  // Remove media item
  const handleRemove = async (item) => {
    // If it has a file_path, delete from storage
    if (item.file_path && !item.id.toString().startsWith('temp_')) {
      try {
        await supabase.storage
          .from('activity-media')
          .remove([item.file_path]);
      } catch (err) {
        console.error('Failed to delete file from storage:', err);
      }
    }

    setMediaItems(prev => {
      const updated = prev.filter(m => m.id !== item.id);
      onMediaChange?.(updated);
      return updated;
    });
  };

  // Set as primary
  const handleSetPrimary = (item) => {
    setMediaItems(prev => {
      const updated = prev.map(m => ({
        ...m,
        is_primary: m.id === item.id
      }));
      onMediaChange?.(updated);
      return updated;
    });
  };

  // Get icon for media type
  const getMediaIcon = (type) => {
    const found = MEDIA_TYPES.find(t => t.id === type);
    return found?.icon || 'File';
  };

  // Render media item preview
  const renderMediaPreview = (item) => {
    const isVideo = item.media_type === 'video';
    const isPhoto = item.media_type === 'photo';
    const isYouTube = item.media_type === 'youtube';
    const isPdf = item.media_type === 'pdf';
    const isPpt = item.media_type === 'powerpoint';
    const isWebsite = item.media_type === 'website';

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all"
      >
        {/* Thumbnail/Preview */}
        <div 
          className="aspect-video bg-gray-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
          onClick={() => setPreviewItem(item)}
        >
          {isPhoto && item.external_url && (
            <img src={item.external_url} alt={item.title} className="w-full h-full object-cover" />
          )}
          {isYouTube && item.thumbnail_url && (
            <>
              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[16px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </>
          )}
          {isVideo && !item.youtube_video_id && (
            <div className="text-center p-4">
              <Icon name="Video" size={40} className="text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 truncate">{item.file_name}</p>
            </div>
          )}
          {isPdf && (
            <div className="text-center p-4">
              <Icon name="FileText" size={40} className="text-red-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 truncate">{item.file_name}</p>
            </div>
          )}
          {isPpt && (
            <div className="text-center p-4">
              <Icon name="Presentation" size={40} className="text-orange-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 truncate">{item.file_name}</p>
            </div>
          )}
          {isWebsite && (
            <div className="text-center p-4">
              <Icon name="Link" size={40} className="text-green-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 truncate">{item.external_url}</p>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(item);
              }}
              className="p-2 bg-white rounded-full hover:bg-gray-100"
              title="Preview"
            >
              <Icon name="Eye" size={18} />
            </button>
            {(isWebsite || isYouTube) && (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
                title="Open in new tab"
              >
                <Icon name="ExternalLink" size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{item.title}</p>
              {item.tagline && (
                <p className="text-xs text-purple-600 font-medium mt-0.5">{item.tagline}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon name={getMediaIcon(item.media_type)} size={12} />
                  {item.media_type}
                </span>
                {item.is_primary && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Primary</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
            {!item.is_primary && (
              <button
                type="button"
                onClick={() => handleSetPrimary(item)}
                className="text-xs text-yellow-600 hover:text-yellow-700 px-2 py-1 rounded hover:bg-yellow-50"
                title="Set as primary"
              >
                ⭐ Primary
              </button>
            )}
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => handleRemove(item)}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              title="Remove"
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Media Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {MEDIA_TYPES.map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setActiveTab(type.id);
              setShowLinkForm(false);
              setLinkInput({ url: '', title: '', tagline: '', description: '' });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === type.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon name={type.icon} size={16} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Upload/Input Area */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6">
        <div className="text-center">
          <Icon name={activeType.icon} size={40} className="mx-auto text-gray-400 mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">{activeType.label}</h3>
          <p className="text-sm text-gray-500 mb-4">{activeType.description}</p>

          {/* File Upload Section */}
          {activeType.accept && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={activeType.accept}
                multiple={activeTab === 'photo'}
                onChange={handleFileUpload}
                className="hidden"
                id={`file-upload-${activeTab}`}
              />
              <label
                htmlFor={`file-upload-${activeTab}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition"
              >
                <Icon name="Upload" size={20} />
                Upload {activeType.label}
              </label>

              {/* YouTube option for videos */}
              {activeTab === 'video' && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">— or add a YouTube link —</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('youtube');
                      setShowLinkForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    <Icon name="Youtube" size={18} />
                    Add YouTube Video
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Link Input Section */}
          {!activeType.accept && (
            <div className="space-y-3">
              {!showLinkForm ? (
                <button
                  type="button"
                  onClick={() => setShowLinkForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  <Icon name="Plus" size={20} />
                  Add {activeType.label}
                </button>
              ) : (
                <div className="max-w-lg mx-auto space-y-3 text-left">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {activeTab === 'youtube' ? 'YouTube URL' : 'Website URL'}
                    </label>
                    <input
                      type="url"
                      value={linkInput.url}
                      onChange={(e) => setLinkInput({ ...linkInput, url: e.target.value })}
                      placeholder={activeTab === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={linkInput.title}
                      onChange={(e) => setLinkInput({ ...linkInput, title: e.target.value })}
                      placeholder="Give this link a title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tagline (optional)</label>
                    <input
                      type="text"
                      value={linkInput.tagline}
                      onChange={(e) => setLinkInput({ ...linkInput, tagline: e.target.value })}
                      placeholder="e.g., Beginner, Light Exercise, Advanced"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <textarea
                      value={linkInput.description}
                      onChange={(e) => setLinkInput({ ...linkInput, description: e.target.value })}
                      placeholder="Add notes about this link"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* YouTube Preview */}
                  {activeTab === 'youtube' && linkInput.url && extractYouTubeId(linkInput.url) && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <img 
                        src={`https://img.youtube.com/vi/${extractYouTubeId(linkInput.url)}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full max-w-xs mx-auto rounded"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLinkSubmit}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                      Add Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkForm(false);
                        setLinkInput({ url: '', title: '', tagline: '', description: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Uploading...</span>
              <span className="text-gray-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Media Items Grid */}
      {mediaItems.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon name="Paperclip" size={18} />
            Attached Media ({mediaItems.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {mediaItems.map(item => renderMediaPreview(item))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold text-lg">{previewItem.title}</h3>
                  <p className="text-sm text-gray-500 capitalize">{previewItem.media_type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <Icon name="X" size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
                {/* Photo */}
                {previewItem.media_type === 'photo' && (
                  <img 
                    src={previewItem.external_url} 
                    alt={previewItem.title}
                    className="max-w-full mx-auto rounded-lg"
                  />
                )}

                {/* YouTube Embed */}
                {previewItem.media_type === 'youtube' && previewItem.youtube_video_id && (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${previewItem.youtube_video_id}?autoplay=1`}
                      title={previewItem.title}
                      className="w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Video Player */}
                {previewItem.media_type === 'video' && previewItem.external_url && !previewItem.youtube_video_id && (
                  <video 
                    src={previewItem.external_url} 
                    controls 
                    autoPlay
                    className="max-w-full mx-auto rounded-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {/* PDF Embed */}
                {previewItem.media_type === 'pdf' && previewItem.external_url && (
                  <iframe
                    src={previewItem.external_url}
                    title={previewItem.title}
                    className="w-full h-[70vh] rounded-lg border"
                  />
                )}

                {/* PowerPoint - Link to download */}
                {previewItem.media_type === 'powerpoint' && (
                  <div className="text-center py-12">
                    <Icon name="Presentation" size={64} className="mx-auto text-orange-500 mb-4" />
                    <h4 className="font-semibold text-lg mb-2">{previewItem.file_name}</h4>
                    <p className="text-gray-500 mb-4">PowerPoint files can't be previewed directly</p>
                    <a
                      href={previewItem.external_url}
                      download
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                      <Icon name="Download" size={20} />
                      Download Presentation
                    </a>
                  </div>
                )}

                {/* Website - iFrame or link */}
                {previewItem.media_type === 'website' && (
                  <div className="text-center py-8">
                    <Icon name="Link" size={48} className="mx-auto text-green-500 mb-4" />
                    <h4 className="font-semibold text-lg mb-2">{previewItem.title}</h4>
                    <p className="text-gray-500 mb-4 break-all">{previewItem.external_url}</p>
                    <a
                      href={previewItem.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      <Icon name="ExternalLink" size={20} />
                      Open Website
                    </a>
                  </div>
                )}

                {/* Description */}
                {previewItem.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{previewItem.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityMediaUploader;
