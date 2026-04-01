import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../AppIcon';
import supabase from '../../services/supabaseClient';

const normalizeExternalUrl = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
};

const getYouTubeEmbedUrl = (media, normalizedUrl) => {
  if (media.youtube_video_id) return `https://www.youtube.com/embed/${media.youtube_video_id}`;
  if (!normalizedUrl) return null;

  try {
    const url = new URL(normalizedUrl);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const getMediaLink = (media) => {
  const normalizedExternal = normalizeExternalUrl(media.external_url);
  if (normalizedExternal) return normalizedExternal;
  if (media.file_path) {
    const { data } = supabase.storage.from('activity-media').getPublicUrl(media.file_path);
    return data?.publicUrl || media.file_path;
  }
  return media.thumbnail_url || null;
};

const getMediaKind = (media, link, youtubeEmbed) => {
  const type = (media.media_type || '').toLowerCase();
  const source = `${link || ''} ${media.file_name || ''} ${media.mime_type || ''}`.toLowerCase();

  if (type === 'youtube' || youtubeEmbed) return 'youtube';
  if (type === 'photo' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(source)) return 'image';
  if (type === 'video' || /\.(mp4|mov|webm|m4v|ogg)$/i.test(source)) return 'video';
  if (type === 'pdf' || /\.pdf$/i.test(source)) return 'pdf';
  if (type === 'website') return 'website';
  if (normalizeExternalUrl(media.external_url)) return 'website';
  return 'file';
};

const ActivityMediaCarousel = ({ mediaItems = [], heading = 'Media & References' }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const normalizedMedia = useMemo(
    () => (Array.isArray(mediaItems) ? mediaItems : []).map((media) => {
      const link = getMediaLink(media);
      const youtubeEmbed = getYouTubeEmbedUrl(media, link);
      const kind = getMediaKind(media, link, youtubeEmbed);
      return { media, link, youtubeEmbed, kind };
    }),
    [mediaItems]
  );

  const imageMedia = useMemo(
    () => normalizedMedia.filter((item) => item.kind === 'image'),
    [normalizedMedia]
  );

  const videoMedia = useMemo(
    () => normalizedMedia.filter((item) => item.kind === 'video' || item.kind === 'youtube'),
    [normalizedMedia]
  );

  const otherMedia = useMemo(
    () => normalizedMedia.filter((item) => !['image', 'video', 'youtube'].includes(item.kind)),
    [normalizedMedia]
  );

  useEffect(() => {
    setImageIndex(0);
    setVideoIndex(0);
  }, [mediaItems]);

  if (normalizedMedia.length === 0) return null;

  const currentImage = imageMedia[Math.min(imageIndex, Math.max(imageMedia.length - 1, 0))];
  const currentVideo = videoMedia[Math.min(videoIndex, Math.max(videoMedia.length - 1, 0))];

  const renderMeta = (item) => {
    if (!item?.media?.title && !item?.media?.tagline && !item?.media?.description) return null;

    return (
      <div className="mt-3 px-1">
        {(item.media.title || item.media.file_name) && (
          <div className="text-sm font-semibold text-slate-800">
            {item.media.title || item.media.file_name}
          </div>
        )}
        {item.media.tagline && (
          <div className="text-xs text-slate-500 mt-1">{item.media.tagline}</div>
        )}
        {item.media.description && (
          <div className="text-xs text-slate-600 mt-2 leading-relaxed">{item.media.description}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{heading}</h3>
      <div className="space-y-4">
        {imageMedia.length > 0 && currentImage && (
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Images & GIFs</p>
              {imageMedia.length > 1 && (
                <span className="text-xs text-slate-500">{imageIndex + 1} / {imageMedia.length}</span>
              )}
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
              <div className="relative">
                <img
                  src={currentImage.link}
                  alt={currentImage.media.title || currentImage.media.file_name || 'Image'}
                  style={{ width: '100%', aspectRatio: '16/9', maxHeight: '65vh', objectFit: 'cover' }}
                />

                {imageMedia.length > 1 && (
                  <>
                    <button
                      onClick={() => setImageIndex((prev) => (prev - 1 + imageMedia.length) % imageMedia.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors flex items-center justify-center"
                      aria-label="Previous image"
                    >
                      <Icon name="ChevronLeft" size={18} />
                    </button>
                    <button
                      onClick={() => setImageIndex((prev) => (prev + 1) % imageMedia.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors flex items-center justify-center"
                      aria-label="Next image"
                    >
                      <Icon name="ChevronRight" size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {renderMeta(currentImage)}

            {imageMedia.length > 1 && (
              <div className="flex items-center justify-center mt-3">
                <div className="flex gap-1.5">
                  {imageMedia.map((item, idx) => (
                    <button
                      key={item.media.id || `img-${idx}`}
                      onClick={() => setImageIndex(idx)}
                      className={`w-2 h-2 rounded-full ${idx === imageIndex ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {videoMedia.length > 0 && currentVideo && (
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Videos</p>
              {videoMedia.length > 1 && (
                <span className="text-xs text-slate-500">{videoIndex + 1} / {videoMedia.length}</span>
              )}
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
              <div className="relative">
                {currentVideo.kind === 'youtube' && currentVideo.youtubeEmbed && (
                  <iframe
                    title={currentVideo.media.title || 'YouTube media'}
                    src={currentVideo.youtubeEmbed}
                    style={{ width: '100%', aspectRatio: '16/9', maxHeight: '65vh', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {currentVideo.kind === 'video' && currentVideo.link && (
                  <video
                    controls
                    preload="metadata"
                    style={{ width: '100%', aspectRatio: '16/9', maxHeight: '65vh', background: 'black' }}
                  >
                    <source src={currentVideo.link} />
                    Your browser does not support video playback.
                  </video>
                )}

                {videoMedia.length > 1 && (
                  <>
                    <button
                      onClick={() => setVideoIndex((prev) => (prev - 1 + videoMedia.length) % videoMedia.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors flex items-center justify-center"
                      aria-label="Previous video"
                    >
                      <Icon name="ChevronLeft" size={18} />
                    </button>
                    <button
                      onClick={() => setVideoIndex((prev) => (prev + 1) % videoMedia.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors flex items-center justify-center"
                      aria-label="Next video"
                    >
                      <Icon name="ChevronRight" size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {renderMeta(currentVideo)}

            {videoMedia.length > 1 && (
              <div className="flex items-center justify-center mt-3">
                <div className="flex gap-1.5">
                  {videoMedia.map((item, idx) => (
                    <button
                      key={item.media.id || `vid-${idx}`}
                      onClick={() => setVideoIndex(idx)}
                      className={`w-2 h-2 rounded-full ${idx === videoIndex ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      aria-label={`Go to video ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {otherMedia.length > 0 && (
          <div className="space-y-2.5">
            {otherMedia.map(({ media, link, kind }) => (
              <div key={media.id} className="p-2.5 rounded-lg border border-slate-100 bg-white">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {media.title || media.file_name || `${media.media_type || 'media'} item`}
                </div>

                {kind === 'pdf' && link && (
                  <iframe
                    title={media.title || 'PDF media'}
                    src={link}
                    style={{ width: '100%', aspectRatio: '4/3', maxHeight: '70vh', border: 0, background: 'white' }}
                    className="mt-2 rounded-lg border border-slate-100"
                  />
                )}

                {kind === 'website' && link && (
                  <>
                    <iframe
                      title={media.title || 'Website preview'}
                      src={link}
                      style={{ width: '100%', aspectRatio: '16/9', maxHeight: '70vh', border: 0, background: 'white' }}
                      className="mt-2 rounded-lg border border-slate-100"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      Some websites block iframe embedding. If the preview is blank, the site is refusing to be framed.
                    </p>
                  </>
                )}

                {media.description && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{media.description}</p>
                )}

                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Open in new tab
                    <Icon name="ExternalLink" size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityMediaCarousel;