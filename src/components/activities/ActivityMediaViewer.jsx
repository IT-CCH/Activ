import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../AppIcon';

const MEDIA_ICONS = {
  video: 'Video',
  photo: 'Image',
  pdf: 'FileText',
  powerpoint: 'Presentation',
  youtube: 'Youtube',
  website: 'Link',
};

const ActivityMediaViewer = ({ 
  media = [], 
  isOpen, 
  onClose, 
  activityName = 'Activity' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  if (!isOpen) return null;

  // Filter media by type
  const filteredMedia = activeTab === 'all' 
    ? media 
    : media.filter(m => m.media_type === activeTab);

  const currentMedia = filteredMedia[currentIndex];

  // Get unique media types
  const mediaTypes = [...new Set(media.map(m => m.media_type))];

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredMedia.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length);
  };

  const renderMediaContent = (item) => {
    if (!item) return null;

    switch (item.media_type) {
      case 'photo':
        return (
          <img 
            src={item.external_url} 
            alt={item.title}
            className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
          />
        );

      case 'youtube':
        return (
          <div className="aspect-video w-full max-w-4xl mx-auto">
            <iframe
              src={`https://www.youtube.com/embed/${item.youtube_video_id}?autoplay=1`}
              title={item.title}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'video':
        return (
          <video 
            src={item.external_url} 
            controls 
            autoPlay
            className="max-w-full max-h-[70vh] mx-auto rounded-lg"
          >
            Your browser does not support the video tag.
          </video>
        );

      case 'pdf':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <iframe
              src={item.external_url}
              title={item.title}
              className="w-full h-[70vh] rounded-lg border bg-white"
            />
          </div>
        );

      case 'powerpoint':
        return (
          <div className="text-center py-12">
            <Icon name="Presentation" size={80} className="mx-auto text-orange-500 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">{item.title || item.file_name}</h3>
            <p className="text-gray-300 mb-6">PowerPoint files can't be previewed directly in the browser</p>
            <a
              href={item.external_url}
              download
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition text-lg font-semibold"
            >
              <Icon name="Download" size={24} />
              Download Presentation
            </a>
          </div>
        );

      case 'website':
        return (
          <div className="text-center py-12">
            <Icon name="Link" size={80} className="mx-auto text-green-400 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
            <p className="text-gray-300 mb-2 break-all max-w-lg mx-auto">{item.external_url}</p>
            {item.description && (
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">{item.description}</p>
            )}
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition text-lg font-semibold"
            >
              <Icon name="ExternalLink" size={24} />
              Open Website
            </a>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <Icon name="File" size={80} className="mx-auto text-gray-400 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
            <a
              href={item.external_url}
              download
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-lg font-semibold"
            >
              <Icon name="Download" size={24} />
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
        onClick={onClose}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 bg-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <h2 className="text-xl font-bold text-white">{activityName}</h2>
            <p className="text-sm text-gray-400">
              {currentMedia?.title || 'Media Gallery'}
              {filteredMedia.length > 1 && ` • ${currentIndex + 1} of ${filteredMedia.length}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <Icon name="X" size={28} className="text-white" />
          </button>
        </div>

        {/* Media Type Tabs */}
        {mediaTypes.length > 1 && (
          <div 
            className="flex items-center justify-center gap-2 p-4 bg-black/30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setActiveTab('all'); setCurrentIndex(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'all' 
                  ? 'bg-white text-black' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All ({media.length})
            </button>
            {mediaTypes.map(type => (
              <button
                key={type}
                onClick={() => { setActiveTab(type); setCurrentIndex(0); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === type 
                    ? 'bg-white text-black' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon name={MEDIA_ICONS[type]} size={16} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
                ({media.filter(m => m.media_type === type).length})
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div 
          className="flex-1 flex items-center justify-center p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Navigation Arrows */}
          {filteredMedia.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <Icon name="ChevronLeft" size={32} className="text-white" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <Icon name="ChevronRight" size={32} className="text-white" />
              </button>
            </>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMedia?.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {renderMediaContent(currentMedia)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Thumbnails */}
        {filteredMedia.length > 1 && (
          <div 
            className="p-4 bg-black/50 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2">
              {filteredMedia.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentIndex 
                      ? 'border-white' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {item.thumbnail_url ? (
                    <img 
                      src={item.thumbnail_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : item.media_type === 'youtube' && item.youtube_video_id ? (
                    <img 
                      src={`https://img.youtube.com/vi/${item.youtube_video_id}/default.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <Icon name={MEDIA_ICONS[item.media_type]} size={24} className="text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {currentMedia?.description && (
          <div 
            className="p-4 bg-black/50 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-300 max-w-2xl mx-auto">{currentMedia.description}</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ActivityMediaViewer;
