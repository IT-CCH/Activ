import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/navigation/Header';
import Icon from '../../components/AppIcon';
import supabase from '../../services/supabaseClient';
import MusicLibraryModal from '../../components/MusicLibraryModal';

// Enhanced Theme Presets with Animation Styles
const THEME_PRESETS = {
  modern: {
    name: 'Modern Minimal',
    description: 'Clean & professional',
    gradient: 'from-slate-200 via-purple-200 to-slate-100',
    accentColor: '#8b5cf6',
    textColor: '#1f2937',
    animationStyle: 'fade',
    icon: '✨',
  },
  vibrant: {
    name: 'Vibrant Energy',
    description: 'Bold & energetic',
    gradient: 'from-orange-200 via-red-200 to-pink-100',
    accentColor: '#f97316',
    textColor: '#1f2937',
    animationStyle: 'slide',
    icon: '🚀',
  },
  elegant: {
    name: 'Elegant Luxury',
    description: 'Sophisticated & premium',
    gradient: 'from-amber-100 via-yellow-100 to-amber-50',
    accentColor: '#f59e0b',
    textColor: '#1f2937',
    animationStyle: 'zoom',
    icon: '👑',
  },
  ocean: {
    name: 'Ocean Breeze',
    description: 'Calm & serene',
    gradient: 'from-cyan-200 via-blue-200 to-teal-100',
    accentColor: '#06b6d4',
    textColor: '#1f2937',
    animationStyle: 'wave',
    icon: '🌊',
  },
  forest: {
    name: 'Forest Nature',
    description: 'Natural & peaceful',
    gradient: 'from-emerald-200 via-green-200 to-teal-100',
    accentColor: '#10b981',
    textColor: '#1f2937',
    animationStyle: 'float',
    icon: '🌿',
  },
  sunset: {
    name: 'Sunset Glow',
    description: 'Warm & inviting',
    gradient: 'from-rose-200 via-orange-200 to-yellow-100',
    accentColor: '#f59e0b',
    textColor: '#1f2937',
    animationStyle: 'pulse',
    icon: '🌅',
  },
  deep: {
    name: 'Deep Space',
    description: 'Mysterious & cosmic',
    gradient: 'from-indigo-300 via-purple-300 to-indigo-200',
    accentColor: '#6366f1',
    textColor: '#1f2937',
    animationStyle: 'glow',
    icon: '🌌',
  },
  pastel: {
    name: 'Pastel Dream',
    description: 'Soft & gentle',
    gradient: 'from-pink-200 via-purple-200 to-blue-200',
    accentColor: '#a855f7',
    textColor: '#1f2937',
    animationStyle: 'bounce',
    icon: '🎨',
  },
  neon: {
    name: 'Neon Nights',
    description: 'Bright & electric',
    gradient: 'from-gray-200 via-purple-200 to-gray-100',
    accentColor: '#22c55e',
    textColor: '#1f2937',
    animationStyle: 'flicker',
    icon: '⚡',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Futuristic & bold',
    gradient: 'from-fuchsia-300 via-cyan-300 to-fuchsia-200',
    accentColor: '#d946ef',
    textColor: '#1f2937',
    animationStyle: 'glitch',
    icon: '🤖',
  },
  candy: {
    name: 'Candy Pop',
    description: 'Sweet & playful',
    gradient: 'from-pink-200 via-rose-200 to-pink-100',
    accentColor: '#ec4899',
    textColor: '#1f2937',
    animationStyle: 'bounce-pop',
    icon: '🍬',
  },
  rainbow: {
    name: 'Rainbow Magic',
    description: 'Colorful & joyful',
    gradient: 'from-purple-200 via-pink-200 to-orange-200',
    accentColor: '#f59e0b',
    textColor: '#1f2937',
    animationStyle: 'rainbow-shift',
    icon: '🌈',
  },
  tropical: {
    name: 'Tropical Paradise',
    description: 'Fresh & vibrant',
    gradient: 'from-lime-200 via-emerald-200 to-cyan-200',
    accentColor: '#84cc16',
    textColor: '#1f2937',
    animationStyle: 'wave-loop',
    icon: '🏝️',
  },
  cosmic: {
    name: 'Cosmic Voyage',
    description: 'Stellar & infinite',
    gradient: 'from-purple-300 via-indigo-300 to-purple-200',
    accentColor: '#8b5cf6',
    textColor: '#1f2937',
    animationStyle: 'cosmic-spin',
    icon: '🚀',
  },
  fire: {
    name: 'Fire Blaze',
    description: 'Hot & passionate',
    gradient: 'from-red-300 via-orange-300 to-yellow-200',
    accentColor: '#ef4444',
    textColor: '#1f2937',
    animationStyle: 'fire-flicker',
    icon: '🔥',
  },
  snow: {
    name: 'Winter Snow',
    description: 'Cool & crisp',
    gradient: 'from-blue-200 via-cyan-200 to-slate-100',
    accentColor: '#0ea5e9',
    textColor: '#1f2937',
    animationStyle: 'snow-fall',
    icon: '❄️',
  },
  aurora: {
    name: 'Aurora Borealis',
    description: 'Magical & ethereal',
    gradient: 'from-green-200 via-cyan-200 to-purple-200',
    accentColor: '#14b8a6',
    textColor: '#1f2937',
    animationStyle: 'aurora-wave',
    icon: '🌌',
  },
  disco: {
    name: 'Disco Fever',
    description: 'Groovy & fun',
    gradient: 'from-purple-200 via-pink-200 to-purple-100',
    accentColor: '#ec4899',
    textColor: '#1f2937',
    animationStyle: 'disco-pulse',
    icon: '🪩',
  },
  gaming: {
    name: 'Gaming Zone',
    description: 'Digital & energetic',
    gradient: 'from-slate-300 via-lime-200 to-slate-200',
    accentColor: '#84cc16',
    textColor: '#1f2937',
    animationStyle: 'game-flash',
    icon: '🎮',
  },
  bloom: {
    name: 'Flower Bloom',
    description: 'Beautiful & fresh',
    gradient: 'from-rose-200 via-pink-200 to-orange-200',
    accentColor: '#f43f5e',
    textColor: '#1f2937',
    animationStyle: 'bloom-grow',
    icon: '🌸',
  },
  jungle: {
    name: 'Jungle Wild',
    description: 'Lush & natural',
    gradient: 'from-green-300 via-amber-200 to-green-200',
    accentColor: '#22c55e',
    textColor: '#1f2937',
    animationStyle: 'jungle-sway',
    icon: '🦜',
  },
  lavender: {
    name: 'Lavender Fields',
    description: 'Calm & soothing',
    gradient: 'from-purple-200 via-pink-200 to-blue-200',
    accentColor: '#a855f7',
    textColor: '#1f2937',
    animationStyle: 'candy-float',
    icon: '💜',
  },
  mint: {
    name: 'Mint Fresh',
    description: 'Cool & refreshing',
    gradient: 'from-green-200 via-cyan-200 to-blue-200',
    accentColor: '#14b8a6',
    textColor: '#1f2937',
    animationStyle: 'mint-swirl',
    icon: '🌿',
  },
  cherry: {
    name: 'Cherry Blossom',
    description: 'Delicate & pretty',
    gradient: 'from-pink-200 via-rose-200 to-red-200',
    accentColor: '#f43f5e',
    textColor: '#1f2937',
    animationStyle: 'petal-fall',
    icon: '🌸',
  },
};

// Slide Templates
const SLIDE_TEMPLATES = [
  { id: 'greeting', name: 'Greeting', icon: '👋', defaultContent: 'Good Day!', category: 'Welcoming' },
  { id: 'activities', name: 'Activities', icon: '📅', defaultContent: 'Activities', category: 'Schedule' },
  { id: 'date-time', name: 'Date & Time', icon: '🕐', defaultContent: 'Current Date & Time', category: 'Time-based' },
  { id: 'quote', name: 'Quote', icon: '💭', defaultContent: 'Daily Inspiration', category: 'Inspirational' },
  { id: 'quiz', name: 'Quiz', icon: '🧠', defaultContent: 'Memory Quiz', category: 'Interactive' },
  { id: 'countdown', name: 'Countdown', icon: '⏰', defaultContent: '10:00 AM Event', category: 'Time-based' },
  { id: 'weather', name: 'Weather', icon: '☀️', defaultContent: 'Weather Info', category: 'Information' },
  { id: 'news', name: 'News', icon: '📰', defaultContent: 'Daily News', category: 'Information' },
  { id: 'celebration', name: 'Celebration', icon: '🎉', defaultContent: 'Celebration', category: 'Special' },
  { id: 'youtube-video', name: 'YouTube Video', icon: '▶️', defaultContent: 'YouTube Video', category: 'Media' },
];

const getAnimationClass = (animationStyle) => {
  const animations = {
    fade: 'animate-pulse',
    slide: 'animate-slide',
    zoom: 'animate-zoom',
    wave: 'animate-bounce',
    float: 'animate-float',
    pulse: 'animate-pulse',
    glow: 'animate-glow',
    bounce: 'animate-bounce',
    flicker: 'animate-flicker',
    swing: 'animate-swing',
    glitch: 'animate-glitch',
    'bounce-pop': 'animate-bounce-pop',
    'rainbow-shift': 'animate-rainbow-shift',
    'wave-loop': 'animate-wave-loop',
    'cosmic-spin': 'animate-cosmic-spin',
    'fire-flicker': 'animate-fire-flicker',
    'snow-fall': 'animate-snow-fall',
    'aurora-wave': 'animate-aurora-wave',
    'disco-pulse': 'animate-disco-pulse',
    'game-flash': 'animate-game-flash',
    'bloom-grow': 'animate-bloom-grow',
    'jungle-sway': 'animate-jungle-sway',
    'candy-float': 'animate-candy-float',
    'ocean-wave': 'animate-ocean-wave',
    'lava-pulse': 'animate-lava-pulse',
    'crystal-shine': 'animate-crystal-shine',
    'matrix-rain': 'animate-matrix-rain',
    'bubble-pop': 'animate-bubble-pop',
    'petal-fall': 'animate-petal-fall',
    'mint-swirl': 'animate-mint-swirl',
  };
  return animations[animationStyle] || 'animate-fade';
};

const getAnimationCSS = () => {
  return `
    @keyframes slide {
      0% { transform: translateX(-100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes zoom {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes glow {
      0%, 100% { text-shadow: 0 0 5px currentColor; }
      50% { text-shadow: 0 0 20px currentColor; }
    }
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes swing {
      0%, 100% { transform: rotate(-1deg); }
      50% { transform: rotate(1deg); }
    }
    @keyframes glitch {
      0% { transform: translate(0); }
      20% { transform: translate(-2px, 2px); }
      40% { transform: translate(-2px, -2px); }
      60% { transform: translate(2px, 2px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0); }
    }
    @keyframes bounce-pop {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    @keyframes rainbow-shift {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    @keyframes wave-loop {
      0%, 100% { transform: translateY(0px) rotateX(0deg); }
      25% { transform: translateY(-15px) rotateX(10deg); }
      50% { transform: translateY(-30px) rotateX(0deg); }
      75% { transform: translateY(-15px) rotateX(-10deg); }
    }
    @keyframes cosmic-spin {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }
    @keyframes fire-flicker {
      0%, 100% { opacity: 1; text-shadow: 0 0 10px #ff6600; }
      50% { opacity: 0.8; text-shadow: 0 0 20px #ff3300; }
    }
    @keyframes snow-fall {
      0% { transform: translateY(-100px) rotateZ(0deg); opacity: 1; }
      100% { transform: translateY(100px) rotateZ(360deg); opacity: 0; }
    }
    @keyframes aurora-wave {
      0%, 100% { transform: skewX(0deg); filter: blur(0px); }
      50% { transform: skewX(5deg); filter: blur(2px); }
    }
    @keyframes disco-pulse {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      25% { transform: scale(1.05); filter: brightness(1.2); }
      50% { transform: scale(1.1); filter: brightness(1.4); }
      75% { transform: scale(1.05); filter: brightness(1.2); }
    }
    @keyframes game-flash {
      0%, 100% { filter: brightness(1) drop-shadow(0 0 0px); }
      50% { filter: brightness(1.5) drop-shadow(0 0 10px); }
    }
    @keyframes bloom-grow {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-slide { animation: slide 0.8s ease-out; }
    .animate-zoom { animation: zoom 0.8s ease-out; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-glow { animation: glow 2s ease-in-out infinite; }
    .animate-flicker { animation: flicker 0.15s ease-in-out infinite; }
    .animate-swing { animation: swing 0.5s ease-in-out; }
    .animate-glitch { animation: glitch 0.3s ease-in-out infinite; }
    .animate-bounce-pop { animation: bounce-pop 0.6s ease-in-out infinite; }
    .animate-rainbow-shift { animation: rainbow-shift 4s linear infinite; }
    .animate-wave-loop { animation: wave-loop 2s ease-in-out infinite; }
    .animate-cosmic-spin { animation: cosmic-spin 3s ease-in-out infinite; }
    .animate-fire-flicker { animation: fire-flicker 0.15s ease-in-out infinite; }
    .animate-snow-fall { animation: snow-fall 2s ease-in infinite; }
    .animate-aurora-wave { animation: aurora-wave 2s ease-in-out infinite; }
    .animate-disco-pulse { animation: disco-pulse 0.8s ease-in-out infinite; }
    .animate-game-flash { animation: game-flash 0.4s ease-in-out infinite; }
    .animate-bloom-grow { animation: bloom-grow 0.8s ease-out; }
    @keyframes jungle-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
    @keyframes candy-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
    @keyframes ocean-wave { 0%, 100% { transform: translateX(0px) rotateZ(0deg); } 50% { transform: translateX(10px) rotateZ(5deg); } }
    @keyframes lava-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
    @keyframes crystal-shine { 0%, 100% { filter: brightness(1) drop-shadow(0 0 0px); } 50% { filter: brightness(1.5) drop-shadow(0 0 20px); } }
    @keyframes matrix-rain { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
    @keyframes bubble-pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes petal-fall { 0% { transform: translateY(0) rotateZ(0deg); opacity: 1; } 100% { transform: translateY(50px) rotateZ(360deg); opacity: 0; } }
    @keyframes mint-swirl { 0%, 100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(15deg); } }
    .animate-jungle-sway { animation: jungle-sway 1.5s ease-in-out infinite; }
    .animate-candy-float { animation: candy-float 2.5s ease-in-out infinite; }
    .animate-ocean-wave { animation: ocean-wave 2s ease-in-out infinite; }
    .animate-lava-pulse { animation: lava-pulse 1.2s ease-in-out infinite; }
    .animate-crystal-shine { animation: crystal-shine 2s ease-in-out infinite; }
    .animate-matrix-rain { animation: matrix-rain 1.5s ease-in-out infinite; }
    .animate-bubble-pop { animation: bubble-pop 0.8s ease-out; }
    .animate-petal-fall { animation: petal-fall 2s ease-in; }
    .animate-mint-swirl { animation: mint-swirl 2s ease-in-out infinite; }
  `;
};

const CustomSlideBuilder = ({ slide, onUpdate, onClose }) => {
  const [content, setContent] = useState(slide.content || '');
  const [subtitle, setSubtitle] = useState(slide.subtitle || '');
  const [icon, setIcon] = useState(slide.icon || '📌');
  const [displayStyle, setDisplayStyle] = useState(slide.displayStyle || 'centered');
  const [youtubeUrl, setYoutubeUrl] = useState(slide.youtubeUrl || '');
  const [frozen, setFrozen] = useState(slide.frozen || false);

  const isYouTubeSlide = slide.template === 'youtube-video' || displayStyle === 'youtube-video';

  // Extract YouTube video ID for preview
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      if (urlObj.searchParams.get('v')) {
        return urlObj.searchParams.get('v');
      }
    } catch (e) {}
    // Check if it's just a video ID
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    return null;
  };

  const videoId = getYouTubeVideoId(youtubeUrl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {isYouTubeSlide ? '▶️ Edit YouTube Slide' : 'Edit Slide'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* YouTube URL Input - Only for YouTube slides */}
          {isYouTubeSlide && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔗 YouTube Video URL
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
              />
              {videoId && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2 bg-gray-50 text-xs text-gray-600">
                    Video ID: {videoId} ✓
                  </div>
                </div>
              )}
              {youtubeUrl && !videoId && (
                <p className="text-sm text-red-500 mt-2">
                  ⚠️ Could not extract video ID. Please check the URL.
                </p>
              )}
            </div>
          )}

          {/* Icon Picker - Not for YouTube slides */}
          {!isYouTubeSlide && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Slide Icon</label>
              <div className="flex gap-2 flex-wrap">
                {['👋', '📅', '💭', '🧠', '⏰', '☀️', '📰', '🎉', '🏆', '💝', '🎯', '🌟'].map(em => (
                  <button
                    key={em}
                    onClick={() => setIcon(em)}
                    className={`text-3xl p-2 rounded transition-all ${
                      icon === em ? 'bg-indigo-500 scale-125' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title/Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isYouTubeSlide ? 'Video Title (Optional)' : 'Main Content'}
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={isYouTubeSlide ? "Enter video title or leave blank" : "Enter main content"}
            />
          </div>

          {/* Subtitle - Not for YouTube slides */}
          {!isYouTubeSlide && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle (Optional)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter subtitle"
              />
            </div>
          )}

          {/* Display Style - Not for YouTube slides */}
          {!isYouTubeSlide && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Display Style</label>
              <select
                value={displayStyle}
                onChange={(e) => setDisplayStyle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="centered">Centered</option>
                <option value="title">Title Card</option>
                <option value="big-icon">Big Icon</option>
                <option value="list">List Style</option>
                <option value="full-width">Full Width</option>
              </select>
            </div>
          )}

          {/* Freeze Toggle */}
          <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg border border-cyan-200">
            <div>
              <p className="font-semibold text-gray-800">❄️ Freeze Slide</p>
              <p className="text-xs text-gray-600">When frozen, slideshow will pause on this slide</p>
            </div>
            <button
              onClick={() => setFrozen(!frozen)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                frozen ? 'bg-cyan-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                frozen ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={() => onUpdate({ 
              ...slide, 
              content, 
              subtitle, 
              icon: isYouTubeSlide ? '▶️' : icon, 
              displayStyle: isYouTubeSlide ? 'youtube-video' : displayStyle,
              youtubeUrl: isYouTubeSlide ? youtubeUrl : undefined,
              frozen
            })}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
          >
            💾 Save Slide
          </button>
        </div>
      </div>
    </div>
  );
};

// Floating Particles for Preview
const FloatingParticles = ({ colors }) => (
  <>
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: Math.random() * 15 + 8,
          height: Math.random() * 15 + 8,
          background: `radial-gradient(circle, ${colors[i % colors.length]}, transparent)`,
        }}
        initial={{ 
          x: Math.random() * 400, 
          y: Math.random() * 300,
          scale: Math.random() * 0.5 + 0.5,
          opacity: 0.6
        }}
        animate={{ 
          y: [null, Math.random() * 300],
          x: [null, Math.random() * 400],
          scale: [null, Math.random() * 1.2 + 0.5],
          opacity: [0.6, 0.2, 0.6]
        }}
        transition={{ 
          duration: Math.random() * 10 + 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ))}
  </>
);

// Simple SVG Analog Clock used in Date/Time slide previews
const AnalogClock = ({ dateTime, size = 120, accentColor = '#111827' }) => {
  const seconds = dateTime.getSeconds();
  const minutes = dateTime.getMinutes();
  const hours = dateTime.getHours() % 12;
  const secDeg = seconds * 6;
  const minDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;
  const c = size / 2;
  const r = c - 6;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <circle cx={c} cy={c} r={r} fill="#ffffff" stroke={accentColor} strokeWidth="3" />
      {[...Array(12)].map((_, i) => {
        const ang = i * 30;
        const x1 = c + Math.sin((ang * Math.PI) / 180) * (r - 6);
        const y1 = c - Math.cos((ang * Math.PI) / 180) * (r - 6);
        const x2 = c + Math.sin((ang * Math.PI) / 180) * r;
        const y2 = c - Math.cos((ang * Math.PI) / 180) * r;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accentColor} strokeWidth={i % 3 === 0 ? 3 : 1} strokeOpacity="0.85" />
        );
      })}

      <line x1={c} y1={c} x2={c} y2={c - r * 0.5} stroke={accentColor} strokeWidth="6" transform={`rotate(${hourDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c} x2={c} y2={c - r * 0.75} stroke={accentColor} strokeWidth="4" transform={`rotate(${minDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c + r * 0.15} x2={c} y2={c - r * 0.9} stroke="#ef4444" strokeWidth="2" transform={`rotate(${secDeg} ${c} ${c})`} strokeLinecap="round" />
      <circle cx={c} cy={c} r="4" fill={accentColor} />
    </svg>
  );
};

const TVDisplayPreview = ({ theme, slides, autoPlay, slideInterval, showParticles = true }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dateTime, setDateTime] = React.useState(new Date());
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-advance slides (respects frozen)
  React.useEffect(() => {
    if (!autoPlay || !slides.length) return;
    
    const currentSlideData = slides[currentSlide];
    if (currentSlideData?.frozen) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => prev >= 100 ? 0 : prev + (100 / (slideInterval * 10)));
    }, 100);
    
    const slideTimer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, slideInterval * 1000);
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(slideTimer);
    };
  }, [autoPlay, slideInterval, slides, currentSlide]);

  if (!slides.length) {
    return (
      <div className="w-80 aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 shadow-2xl">
        <div className="text-4xl mb-2">📺</div>
        <div className="text-gray-600 text-center font-semibold text-sm">No slides configured</div>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const themeColors = theme.colors || ['rgba(99,102,241,0.6)', 'rgba(168,85,247,0.6)', 'rgba(236,72,153,0.6)'];

  // Helper to extract YouTube video ID
  const getVideoId = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtu.be')) return urlObj.pathname.slice(1);
      if (urlObj.searchParams.get('v')) return urlObj.searchParams.get('v');
    } catch (e) {}
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    return null;
  };

  // Render slide content
  const renderSlideContent = () => {
    // YouTube Video Slide
    if (slide.displayStyle === 'youtube-video' && slide.youtubeUrl) {
      const videoId = getVideoId(slide.youtubeUrl);
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center w-full h-full p-4"
        >
          {slide.content && slide.content !== 'YouTube Video' && (
            <p className="text-sm font-bold text-gray-800 mb-2 truncate">{slide.content}</p>
          )}
          {videoId ? (
            <div className="w-full max-w-[90%] aspect-video rounded-lg overflow-hidden shadow-lg bg-black">
              <img 
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-2xl">⚠️</div>
          )}
        </motion.div>
      );
    }

    // Date/Time Slide
    if (slide.displayStyle === 'date-time') {
      const hour = dateTime.getHours();
      const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
      const dayName = dateTime.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = dateTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timeStr = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-1"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-2xl"
          >
            {hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'}
          </motion.div>
          <h2 className="text-xl font-black" style={{ color: theme.accentColor }}>{greeting}</h2>
          <p className="text-sm font-bold" style={{ color: theme.accentColor }}>{dayName}</p>
          <p className="text-xs font-semibold text-gray-700">{dateStr}</p>
          <div className="inline-block mt-1 px-3 py-1 bg-white/80 backdrop-blur rounded-lg shadow border" style={{ borderColor: theme.accentColor }}>
            <span className="text-sm font-bold" style={{ color: theme.accentColor }}>{timeStr}</span>
          </div>
        </motion.div>
      );
    }

    // List Style (Activities)
    if (slide.displayStyle === 'list') {
      const items = slide.subtitle ? slide.subtitle.split('\n').filter(Boolean).slice(0, 3) : [];
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full px-4 space-y-1"
        >
          <div className="text-center mb-2">
            <span className="text-xl">{slide.icon}</span>
            <h3 className="text-sm font-bold text-gray-800">{slide.content}</h3>
          </div>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 bg-white/70 backdrop-blur rounded-lg px-2 py-1 shadow-sm text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }}></span>
                <span className="text-gray-800 truncate">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );
    }

    // Default centered style
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-2"
      >
        <motion.div
          className="text-4xl"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {slide.icon}
        </motion.div>
        <h3 className="text-lg font-black text-gray-800 drop-shadow">{slide.content}</h3>
        {slide.subtitle && !slide.youtubeUrl && (
          <p className="text-xs text-gray-600 max-w-[80%] mx-auto truncate">{slide.subtitle.split('\n')[0]}</p>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`w-80 aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center relative bg-gradient-to-br ${theme.gradient} shadow-2xl border border-white/20`}>
      {/* Floating particles (simplified) */}
      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-40"
              style={{
                width: 8 + Math.random() * 12,
                height: 8 + Math.random() * 12,
                background: `radial-gradient(circle, ${themeColors[i % themeColors.length]}, transparent)`,
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Animated shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-20 h-20 rounded-full opacity-20"
          style={{ background: theme.accentColor, top: '-5%', right: '-5%' }}
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-16 h-16 rounded-2xl rotate-45 opacity-15"
          style={{ background: theme.accentColor, bottom: '10%', left: '-3%' }}
          animate={{ rotate: [45, 90, 45] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={slide.id}>
            {renderSlideContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Frozen indicator */}
      {slide.frozen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500/90 backdrop-blur rounded-full text-white text-[10px] font-medium flex items-center gap-1 z-20"
        >
          <span>❄️</span>
          <span>Frozen</span>
        </motion.div>
      )}

      {/* Present Only (Solo) indicator */}
      {slide.presentOnly && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500/90 backdrop-blur rounded-full text-white text-[10px] font-medium flex items-center gap-1 z-20"
        >
          <span>🎯</span>
          <span>Solo</span>
        </motion.div>
      )}

      {/* Progress bar */}
      {autoPlay && !slide.frozen && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Navigation dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((s, idx) => (
          <motion.button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className="rounded-full transition-all"
            style={{
              width: idx === currentSlide ? '14px' : '5px',
              height: '5px',
              backgroundColor: idx === currentSlide ? theme.accentColor : `${theme.accentColor}50`,
              boxShadow: idx === currentSlide ? `0 0 6px ${theme.accentColor}` : 'none',
            }}
            whileHover={{ scale: 1.3 }}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div 
        className="absolute top-2 right-2 z-20 text-xs font-bold px-2 py-0.5 rounded-lg bg-white/30 backdrop-blur-sm flex items-center gap-1" 
        style={{ color: theme.accentColor }}
      >
        <span>{currentSlide + 1}</span>
        <span className="opacity-60">/</span>
        <span className="opacity-60">{slides.length}</span>
        {slide.frozen && <span className="ml-1">❄️</span>}
      </div>
    </div>
  );
};

const TVDisplayControlPanel = () => {
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [autoPlay, setAutoPlay] = useState(true);
  const [slideInterval, setSlideInterval] = useState(15);
  const [showParticles, setShowParticles] = useState(true);
  const [particleCount, setParticleCount] = useState(12);
  // Music settings (YouTube)
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicSource, setMusicSource] = useState('youtube'); // 'youtube' or 'local'
  const [playlistInput, setPlaylistInput] = useState('');
  const [musicVolume, setMusicVolume] = useState(50);
  // Local music settings
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [selectedLocalPlaylist, setSelectedLocalPlaylist] = useState(null);
  const [localPlaylistSongs, setLocalPlaylistSongs] = useState([]);
  const [uiScale, setUiScale] = useState(1);
  const [slides, setSlides] = useState([
    { id: Date.now() - 2, template: 'date-time', icon: '🕐', content: 'Current Date & Time', subtitle: '', displayStyle: 'date-time' },
    { id: Date.now() - 1, template: 'greeting', icon: '👋', content: 'Good Day!', subtitle: '', displayStyle: 'centered' },
    { id: Date.now(), template: 'activities', icon: '📅', content: 'Activities', subtitle: '09:00 Chair Yoga\n14:00 Art Therapy\n18:00 Social Hour', displayStyle: 'list' },
  ]);
  const [editingSlide, setEditingSlide] = useState(null);
  const [newSlideTemplate, setNewSlideTemplate] = useState('greeting');
  
  // Activity state
  const [todayActivities, setTodayActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch today's activities from Supabase
  const fetchTodayActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          session_date,
          start_time,
          end_time,
          status,
          activities (
            id,
            name,
            description,
            category
          )
        `)
        .eq('session_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTodayActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Use sample activities if fetch fails
      setTodayActivities([
        { id: 1, start_time: '09:00', end_time: '09:45', status: 'Upcoming', activities: { name: 'Morning Chair Yoga', category: 'physical' } },
        { id: 2, start_time: '11:00', end_time: '12:00', status: 'Upcoming', activities: { name: 'Arts & Crafts', category: 'creative' } },
        { id: 3, start_time: '14:00', end_time: '15:00', status: 'Upcoming', activities: { name: 'Music Therapy', category: 'therapeutic' } },
      ]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // Update current time every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch activities on mount
  useEffect(() => {
    fetchTodayActivities();
  }, [fetchTodayActivities]);

  // Calculate countdown for an activity
  const getCountdown = (startTime) => {
    const now = currentTime;
    const [hours, minutes] = startTime.split(':').map(Number);
    const activityTime = new Date(now);
    activityTime.setHours(hours, minutes, 0, 0);
    
    const diff = activityTime.getTime() - now.getTime();
    
    if (diff <= 0) return { text: 'Started', isStarted: true, isPast: diff < -3600000 };
    
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hoursLeft > 0) {
      return { text: `${hoursLeft}h ${minutesLeft}m`, isStarted: false, isPast: false };
    } else if (minutesLeft > 0) {
      return { text: `${minutesLeft}m ${secondsLeft}s`, isStarted: false, isPast: false };
    } else {
      return { text: `${secondsLeft}s`, isStarted: false, isPast: false, isImminent: true };
    }
  };

  // Add individual activity as a slide
  const addActivitySlide = (activity) => {
    const newSlide = {
      id: Date.now(),
      template: 'activity-single',
      icon: getCategoryIcon(activity.activities?.category),
      content: activity.activities?.name || 'Activity',
      subtitle: `${activity.start_time} - ${activity.end_time}`,
      displayStyle: 'big-icon',
      activityData: activity,
    };
    setSlides([...slides, newSlide]);
  };

  // Get icon for activity category
  const getCategoryIcon = (category) => {
    const icons = {
      physical: '🏃',
      creative: '🎨',
      therapeutic: '💆',
      social: '👥',
      cognitive: '🧠',
      musical: '🎵',
      outdoor: '🌳',
      spiritual: '🙏',
    };
    return icons[category] || '📅';
  };

  // Fetch songs for selected local playlist
  const fetchLocalPlaylistSongs = useCallback(async (playlistId) => {
    if (!playlistId) {
      setLocalPlaylistSongs([]);
      return;
    }
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
      
      // Get signed URLs for each song
      const songsWithUrls = await Promise.all(
        (data || []).map(async (ps) => {
          if (ps.songs?.file_path) {
            const { data: urlData } = await supabase.storage
              .from('songs')
              .createSignedUrl(ps.songs.file_path, 86400); // 24 hour expiry
            return {
              ...ps.songs,
              signedUrl: urlData?.signedUrl
            };
          }
          return ps.songs;
        })
      );
      
      setLocalPlaylistSongs(songsWithUrls.filter(s => s));
    } catch (error) {
      console.error('Error fetching local playlist songs:', error);
    }
  }, []);

  // Handle playlist selection from modal
  const handleSelectLocalPlaylist = useCallback((playlist) => {
    setSelectedLocalPlaylist(playlist);
    fetchLocalPlaylistSongs(playlist.id);
  }, [fetchLocalPlaylistSongs]);

  // Initialize from existing saved config if available
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('tvDisplayConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.music) {
          setMusicEnabled(Boolean(parsed.music.enabled));
          setMusicSource(parsed.music.type || 'youtube');
          setPlaylistInput(parsed.music.playlist || '');
          setMusicVolume(typeof parsed.music.volume === 'number' ? parsed.music.volume : 50);
          // Restore local playlist if available
          if (parsed.music.localPlaylist) {
            setSelectedLocalPlaylist(parsed.music.localPlaylist);
            fetchLocalPlaylistSongs(parsed.music.localPlaylist.id);
          }
          if (parsed.music.localSongs) {
            setLocalPlaylistSongs(parsed.music.localSongs);
          }
        }
        if (typeof parsed.uiScale === 'number') setUiScale(parsed.uiScale);
        // If slides are present in saved config, restore them but ensure a date-time slide is first
        if (Array.isArray(parsed.slides)) {
          const savedSlides = parsed.slides.slice();
          const dtIndex = savedSlides.findIndex(s => s.displayStyle === 'date-time' || s.template === 'date-time');
          if (dtIndex > 0) {
            const [dtSlide] = savedSlides.splice(dtIndex, 1);
            savedSlides.unshift(dtSlide);
          } else if (dtIndex === -1) {
            // Insert a default date-time slide at the front
            savedSlides.unshift({ id: Date.now() + 1, template: 'date-time', icon: '🕐', content: 'Current Date & Time', subtitle: '', displayStyle: 'date-time' });
          }
          setSlides(savedSlides);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [fetchLocalPlaylistSongs]);

  const startDisplay = () => {
    // Save current configuration to localStorage before opening
    // Ensure date-time slide is first when saving
    const slidesToSave = slides.slice();
    const dtIdx = slidesToSave.findIndex(s => s.displayStyle === 'date-time' || s.template === 'date-time');
    if (dtIdx > 0) {
      const [dt] = slidesToSave.splice(dtIdx, 1);
      slidesToSave.unshift(dt);
    } else if (dtIdx === -1) {
      slidesToSave.unshift({ id: Date.now() + 2, template: 'date-time', icon: '🕐', content: 'Current Date & Time', subtitle: '', displayStyle: 'date-time' });
    }

    localStorage.setItem('tvDisplayConfig', JSON.stringify({
      selectedTheme,
      autoPlay,
      slideInterval,
      slides: slidesToSave,
      showParticles,
      particleCount,
      uiScale,
      music: {
        enabled: musicEnabled,
        type: musicSource,
        playlist: playlistInput,
        volume: musicVolume,
        localPlaylist: selectedLocalPlaylist,
        localSongs: localPlaylistSongs,
      },
    }));
    
    const tvWindow = window.open('/tv-display', '_blank');
    if (tvWindow) {
      tvWindow.focus();
      setTimeout(() => {
        tvWindow.requestFullscreen?.();
      }, 500);
    }
  };

  // BroadcastChannel for live updates to TV Display
  const broadcastChannel = React.useRef(null);
  
  React.useEffect(() => {
    broadcastChannel.current = new BroadcastChannel('tv-display-sync');
    return () => {
      if (broadcastChannel.current) {
        broadcastChannel.current.close();
      }
    };
  }, []);

  // Persist config to localStorage (used for live-sync with the running display)
  const persistConfig = React.useCallback(() => {
    try {
      const slidesToSave = slides.slice();
      const dtIdx = slidesToSave.findIndex(s => s.displayStyle === 'date-time' || s.template === 'date-time');
      if (dtIdx > 0) {
        const [dt] = slidesToSave.splice(dtIdx, 1);
        slidesToSave.unshift(dt);
      } else if (dtIdx === -1) {
        slidesToSave.unshift({ id: Date.now() + 2, template: 'date-time', icon: '🕐', content: 'Current Date & Time', subtitle: '', displayStyle: 'date-time' });
      }

      const configData = {
        selectedTheme,
        autoPlay,
        slideInterval,
        slides: slidesToSave,
        showParticles,
        particleCount,
        uiScale,
        music: {
          enabled: musicEnabled,
          type: musicSource,
          playlist: playlistInput,
          volume: musicVolume,
          localPlaylist: selectedLocalPlaylist,
          localSongs: localPlaylistSongs,
        },
      };

      localStorage.setItem('tvDisplayConfig', JSON.stringify(configData));
      
      // Broadcast to TV Display for instant live updates
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'CONFIG_UPDATE',
          config: configData,
        });
      }
    } catch (e) {
      console.warn('persistConfig failed', e);
    }
  }, [selectedTheme, autoPlay, slideInterval, slides, showParticles, particleCount, uiScale, musicEnabled, musicSource, playlistInput, musicVolume, selectedLocalPlaylist, localPlaylistSongs]);

  // Autosave whenever key settings change so the TV window updates via storage event
  React.useEffect(() => {
    // debounce quick changes slightly to avoid too-frequent writes
    const t = setTimeout(() => persistConfig(), 150);
    return () => clearTimeout(t);
  }, [persistConfig]);

  const addSlide = () => {
    const template = SLIDE_TEMPLATES.find(t => t.id === newSlideTemplate);
    if (template) {
      // Set appropriate displayStyle based on template
      let displayStyle = 'centered';
      if (template.id === 'date-time') displayStyle = 'date-time';
      else if (template.id === 'activities') displayStyle = 'list';
      else if (template.id === 'youtube-video') displayStyle = 'youtube-video';
      
      const newSlide = {
        id: Date.now(),
        template: template.id,
        icon: template.icon,
        content: template.defaultContent,
        subtitle: '',
        displayStyle,
        frozen: false,
      };
      
      // For YouTube slides, prompt for URL
      if (template.id === 'youtube-video') {
        newSlide.youtubeUrl = '';
        newSlide.content = 'YouTube Video';
      }
      
      setSlides([...slides, newSlide]);
      
      // Automatically open edit modal for YouTube slides
      if (template.id === 'youtube-video') {
        setTimeout(() => setEditingSlide(newSlide), 100);
      }
    }
  };

  const updateSlide = (updatedSlide) => {
    setSlides(slides.map(s => s.id === updatedSlide.id ? updatedSlide : s));
    setEditingSlide(null);
  };

  const removeSlide = (id) => {
    setSlides(slides.filter(s => s.id !== id));
  };

  const themeArray = Object.entries(THEME_PRESETS).map(([key, value]) => ({ key, ...value }));

  return (
    <>
      <Header />
      <style>{getAnimationCSS()}</style>
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gray-50 text-gray-900 p-6"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900">📺 Advanced TV Display Control</h1>
            <p className="text-gray-600 text-sm mt-2">Create animated, customizable slides with beautiful themes</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Theme Selection */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🎨 Choose Your Theme</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {themeArray.map((theme) => (
                    <button
                      key={theme.key}
                      onClick={() => setSelectedTheme(theme.key)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedTheme === theme.key
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-3xl mb-1">{theme.icon}</div>
                      <div className={`h-8 rounded mb-2 bg-gradient-to-r ${theme.gradient}`}></div>
                      <p className="font-bold text-xs text-gray-900">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slide Management */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">📑 Manage Slides</h2>
                  <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{slides.length} slides</span>
                </div>

                {/* Add Slide */}
                <div className="mb-6 flex gap-2">
                  <select
                    value={newSlideTemplate}
                    onChange={(e) => setNewSlideTemplate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SLIDE_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={addSlide}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold whitespace-nowrap"
                  >
                    + Add Slide
                  </button>
                </div>

                {/* Slides Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {slides.map((slide, idx) => (
                    <motion.div 
                      key={slide.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl border-2 hover:shadow-md transition-all ${
                        slide.presentOnly
                          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400 ring-2 ring-orange-300'
                          : slide.frozen 
                            ? 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-400' 
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl relative">
                          {slide.icon}
                          {slide.presentOnly && (
                            <span className="absolute -top-1 -right-1 text-sm">🎯</span>
                          )}
                          {slide.frozen && !slide.presentOnly && (
                            <span className="absolute -top-1 -right-1 text-sm">❄️</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate">{slide.content}</p>
                            {slide.presentOnly && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Solo</span>
                            )}
                            {slide.frozen && (
                              <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">Frozen</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Style: {slide.displayStyle}
                            {slide.template === 'youtube-video' && slide.youtubeUrl && ' • YouTube'}
                          </p>
                          {slide.youtubeUrl && (
                            <p className="text-xs text-red-600 mt-1 truncate">🔗 {slide.youtubeUrl}</p>
                          )}
                          {slide.subtitle && !slide.youtubeUrl && (
                            <p className="text-xs text-gray-600 mt-1 truncate">{slide.subtitle.split('\n')[0]}...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (idx > 0) {
                                const newSlides = [...slides];
                                [newSlides[idx], newSlides[idx - 1]] = [newSlides[idx - 1], newSlides[idx]];
                                setSlides(newSlides);
                              }
                            }}
                            disabled={idx === 0}
                            className="p-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-40"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => {
                              if (idx < slides.length - 1) {
                                const newSlides = [...slides];
                                [newSlides[idx], newSlides[idx + 1]] = [newSlides[idx + 1], newSlides[idx]];
                                setSlides(newSlides);
                              }
                            }}
                            disabled={idx === slides.length - 1}
                            className="p-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-40"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="flex-1"></div>
                        <button
                          onClick={() => {
                            setSlides(prev => prev.map(s => 
                              s.id === slide.id ? { ...s, frozen: !s.frozen } : s
                            ));
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            slide.frozen 
                              ? 'bg-cyan-500 text-white hover:bg-cyan-600' 
                              : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                          }`}
                          title={slide.frozen ? 'Unfreeze slide (resume auto-advance)' : 'Freeze slide (stay on this slide)'}
                        >
                          {slide.frozen ? '🔥 Unfreeze' : '❄️ Freeze'}
                        </button>
                        <button
                          onClick={() => {
                            setSlides(prev => prev.map(s => 
                              s.id === slide.id 
                                ? { ...s, presentOnly: !s.presentOnly } 
                                : { ...s, presentOnly: false }
                            ));
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            slide.presentOnly 
                              ? 'bg-orange-500 text-white hover:bg-orange-600' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                          title={slide.presentOnly ? 'Stop presenting only this slide' : 'Present only this slide (hide others)'}
                        >
                          {slide.presentOnly ? '🎯 Solo On' : '🎯 Solo'}
                        </button>
                        <button
                          onClick={() => setEditingSlide(slide)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => removeSlide(slide.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          🗑️
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Today's Activities with Countdown */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">📅 Today's Activities</h2>
                  <button
                    onClick={fetchTodayActivities}
                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium flex items-center gap-1"
                  >
                    <Icon name="RefreshCw" size={14} /> Refresh
                  </button>
                </div>
                
                {activitiesLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading activities...
                  </div>
                ) : todayActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    No activities scheduled for today
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayActivities.map((activity, idx) => {
                      const countdown = getCountdown(activity.start_time);
                      const isInSlides = slides.some(s => s.activityData?.id === activity.id);
                      
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            countdown.isStarted 
                              ? countdown.isPast 
                                ? 'bg-gray-100 border-gray-300 opacity-60'
                                : 'bg-green-50 border-green-300'
                              : countdown.isImminent 
                                ? 'bg-amber-50 border-amber-400 animate-pulse'
                                : 'bg-white border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{getCategoryIcon(activity.activities?.category)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900">{activity.activities?.name || 'Activity'}</p>
                              <p className="text-sm text-gray-600">{activity.start_time} - {activity.end_time}</p>
                            </div>
                            
                            {/* Countdown Timer */}
                            <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${
                              countdown.isStarted 
                                ? 'bg-green-500 text-white'
                                : countdown.isImminent 
                                  ? 'bg-amber-500 text-white animate-bounce'
                                  : 'bg-purple-100 text-purple-700'
                            }`}>
                              {countdown.isStarted ? '🟢 Started' : `⏳ ${countdown.text}`}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => addActivitySlide(activity)}
                                disabled={isInSlides}
                                className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1 ${
                                  isInSlides 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                                title={isInSlides ? 'Already in slides' : 'Add as slide'}
                              >
                                {isInSlides ? '✓ Added' : '➕ Add'}
                              </button>
                              <button
                                onClick={() => {
                                  // Add to slides and immediately start display with this activity
                                  if (!isInSlides) addActivitySlide(activity);
                                  // Open TV display
                                  setTimeout(() => startDisplay(), 100);
                                }}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm flex items-center gap-1"
                              >
                                ▶️ Present
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-4 text-center">
                  💡 Activities show live countdowns. Click "Add" to include in slideshow or "Present" to display immediately.
                </p>
              </div>

              {/* Display Settings */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Playback Settings</h2>
                
                {/* Auto-play Toggle */}
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-900">Auto-play Slides</p>
                      <p className="text-sm text-gray-600">Slides advance automatically</p>
                    </div>
                    <button
                      onClick={() => setAutoPlay(!autoPlay)}
                      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                        autoPlay ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                          autoPlay ? 'translate-x-10' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Slide Duration */}
                {autoPlay && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-gray-900">Slide Duration</label>
                      <span className="text-2xl font-bold text-indigo-600">{slideInterval}s</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      step="1"
                      value={slideInterval}
                      onChange={(e) => setSlideInterval(Number(e.target.value))}
                      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>3s (Fast)</span>
                      <span>30s (Slow)</span>
                    </div>
                  </div>
                )}

                {/* Music Settings */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎵 Background Music</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                    <div>
                      <p className="font-medium text-gray-900">Enable Music</p>
                      <p className="text-xs text-gray-600">Play music during the display</p>
                    </div>
                    <button
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                        musicEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                          musicEnabled ? 'translate-x-10' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {musicEnabled && (
                    <div className="space-y-4">
                      {/* Music Source Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Music Source</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setMusicSource('youtube')}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                              musicSource === 'youtube'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            YouTube
                          </button>
                          <button
                            onClick={() => setMusicSource('local')}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                              musicSource === 'local'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon name="Music" size={20} />
                            My Library
                          </button>
                        </div>
                      </div>

                      {/* YouTube Settings */}
                      {musicSource === 'youtube' && (
                        <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <label className="block text-sm font-medium text-gray-700">YouTube Playlist URL or ID</label>
                          <input
                            type="text"
                            value={playlistInput}
                            onChange={(e) => setPlaylistInput(e.target.value)}
                            placeholder="https://www.youtube.com/playlist?list=PL... or playlist ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>
                      )}

                      {/* Local Music Settings */}
                      {musicSource === 'local' && (
                        <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">Selected Playlist</p>
                              {selectedLocalPlaylist ? (
                                <p className="text-sm text-purple-600">{selectedLocalPlaylist.name} ({localPlaylistSongs.length} songs)</p>
                              ) : (
                                <p className="text-sm text-gray-500">No playlist selected</p>
                              )}
                            </div>
                            <button
                              onClick={() => setShowMusicLibrary(true)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                              <Icon name="Library" size={18} />
                              Open Library
                            </button>
                          </div>

                          {/* Show selected playlist songs */}
                          {localPlaylistSongs.length > 0 && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {localPlaylistSongs.slice(0, 5).map((song, idx) => (
                                <div key={song.id} className="flex items-center gap-2 p-2 bg-white rounded-lg text-sm">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1 truncate font-medium">{song.name}</span>
                                  <span className="text-gray-500">{song.artist}</span>
                                </div>
                              ))}
                              {localPlaylistSongs.length > 5 && (
                                <p className="text-xs text-purple-600 text-center">+ {localPlaylistSongs.length - 5} more songs</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Volume Control */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Volume</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(Number(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="text-xs text-gray-600 mt-1">Volume: {musicVolume}%</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Start Button */}
                <button
                  onClick={startDisplay}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Icon name="Play" size={20} />
                  Start TV Display (Fullscreen)
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sticky top-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">📺 Live Preview</h2>
                    <div style={{ transform: `scale(${uiScale})`, transformOrigin: 'top center' }} className="inline-block">
                      <TVDisplayPreview
                        theme={THEME_PRESETS[selectedTheme]}
                        slides={slides.some(s => s.presentOnly) ? slides.filter(s => s.presentOnly) : slides}
                        autoPlay={autoPlay}
                        slideInterval={slideInterval}
                        showParticles={showParticles}
                      />
                    </div>
                  </div>

                  {/* Animation Settings */}
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold text-gray-900">✨ Animation Settings</h3>
                    
                    {/* Particles Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Show Particles</p>
                        <p className="text-xs text-gray-600">Animated floating particles</p>
                      </div>
                      <button
                        onClick={() => setShowParticles(!showParticles)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          showParticles ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            showParticles ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Particle Count Slider */}
                    {showParticles && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-gray-900">Particle Count</label>
                          <span className="text-sm font-bold text-indigo-600">{particleCount}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          value={particleCount}
                          onChange={(e) => setParticleCount(Number(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-xs text-gray-600 mt-2">Adjust animation performance (0-25)</p>
                      </div>
                    )}

                    {/* UI Scale Control */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-medium text-gray-900">UI Scale</label>
                        <span className="text-sm font-bold text-indigo-600">{Math.round(uiScale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="140"
                        step="1"
                        value={Math.round(uiScale * 100)}
                        onChange={(e) => setUiScale(Number(e.target.value) / 100)}
                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-xs text-gray-600 mt-2">Scale the preview and fullscreen display (70% - 140%)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Slide Modal */}
        {editingSlide && (
          <CustomSlideBuilder
            slide={editingSlide}
            onUpdate={updateSlide}
            onClose={() => setEditingSlide(null)}
          />
        )}

        {/* Music Library Modal */}
        <MusicLibraryModal
          isOpen={showMusicLibrary}
          onClose={() => setShowMusicLibrary(false)}
          onSelectPlaylist={handleSelectLocalPlaylist}
          currentPlaylistId={selectedLocalPlaylist?.id}
        />
      </motion.main>
    </>
  );
};

export default TVDisplayControlPanel;
