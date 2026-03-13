import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';

// Theme Presets
const THEME_PRESETS = {
  modern: {
    name: 'Modern Minimal',
    description: 'Clean & professional',
    gradient: 'from-slate-900 via-purple-900 to-slate-900',
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    accentColor: '#ddd6fe',
    textColor: '#ffffff',
    backgroundColor: '#0f172a',
    overlayOpacity: 0.3,
    borderColor: 'border-purple-400/20',
  },
  vibrant: {
    name: 'Vibrant Energy',
    description: 'Bold & energetic',
    gradient: 'from-orange-900 via-red-900 to-pink-900',
    primaryColor: '#ea580c',
    secondaryColor: '#fb923c',
    accentColor: '#fed7aa',
    textColor: '#ffffff',
    backgroundColor: '#1f1015',
    overlayOpacity: 0.25,
    borderColor: 'border-orange-400/20',
  },
  elegant: {
    name: 'Elegant Luxury',
    description: 'Sophisticated & premium',
    gradient: 'from-amber-950 via-yellow-900 to-amber-950',
    primaryColor: '#b45309',
    secondaryColor: '#d97706',
    accentColor: '#fcd34d',
    textColor: '#fffbeb',
    backgroundColor: '#0f0704',
    overlayOpacity: 0.35,
    borderColor: 'border-yellow-400/20',
  },
  ocean: {
    name: 'Ocean Breeze',
    description: 'Calm & serene',
    gradient: 'from-cyan-900 via-blue-900 to-teal-900',
    primaryColor: '#0891b2',
    secondaryColor: '#06b6d4',
    accentColor: '#a5f3fc',
    textColor: '#ecf0f1',
    backgroundColor: '#082f49',
    overlayOpacity: 0.3,
    borderColor: 'border-cyan-400/20',
  },
  forest: {
    name: 'Forest Nature',
    description: 'Natural & peaceful',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    primaryColor: '#047857',
    secondaryColor: '#059669',
    accentColor: '#a7f3d0',
    textColor: '#f0fdf4',
    backgroundColor: '#051b15',
    overlayOpacity: 0.32,
    borderColor: 'border-emerald-400/20',
  },
  sunset: {
    name: 'Golden Sunset',
    description: 'Warm & welcoming',
    gradient: 'from-rose-900 via-orange-900 to-yellow-900',
    primaryColor: '#dc2626',
    secondaryColor: '#f97316',
    accentColor: '#fbbf24',
    textColor: '#fef3c7',
    backgroundColor: '#0f0704',
    overlayOpacity: 0.28,
    borderColor: 'border-rose-400/20',
  },
  deep: {
    name: 'Deep Space',
    description: 'Dark & mysterious',
    gradient: 'from-indigo-950 via-purple-950 to-black',
    primaryColor: '#3730a3',
    secondaryColor: '#6366f1',
    accentColor: '#c7d2fe',
    textColor: '#e0e7ff',
    backgroundColor: '#09090b',
    overlayOpacity: 0.4,
    borderColor: 'border-indigo-400/20',
  },
  pastel: {
    name: 'Soft Pastel',
    description: 'Gentle & friendly',
    gradient: 'from-pink-800 via-purple-800 to-blue-800',
    primaryColor: '#be185d',
    secondaryColor: '#a855f7',
    accentColor: '#e9d5ff',
    textColor: '#fdf2f8',
    backgroundColor: '#1f0933',
    overlayOpacity: 0.25,
    borderColor: 'border-pink-400/20',
  },
};

const TVDisplayPreview = ({ theme, autoPlay, slideInterval }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!autoPlay) return;
    
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, slideInterval * 1000);
    
    return () => clearInterval(slideTimer);
  }, [autoPlay, slideInterval]);

  const slides = [
    { id: 1, type: 'greeting', title: 'Welcome' },
    { id: 2, type: 'activities', title: "Today's Activities" },
    { id: 3, type: 'quiz', title: 'Memory Quiz' }
  ];

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center relative">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`}
        style={{ opacity: 1 }}
      ></div>
      
      {/* Preview overlay */}
      <div 
        className="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-transparent"
      ></div>

      <div className="relative z-10 text-center" style={{ color: theme.textColor }}>
        {currentSlide === 0 && (
          <div className="space-y-3">
            <div className="font-black" style={{ fontSize: '2rem' }}>
              Good Day!
            </div>
            <div className="opacity-80" style={{ fontSize: '1rem' }}>
              {formatTime(currentTime)}
            </div>
            <div className="opacity-60" style={{ fontSize: '0.9rem' }}>
              {formatDate(currentTime)}
            </div>
          </div>
        )}

        {currentSlide === 1 && (
          <div className="space-y-2">
            <div className="font-black" style={{ fontSize: '1.8rem' }}>
              📅 Activities
            </div>
            <div className="opacity-70 space-y-1" style={{ fontSize: '0.9rem' }}>
              <div>09:00 Chair Yoga</div>
              <div>14:00 Art Therapy</div>
              <div>18:00 Social Hour</div>
            </div>
          </div>
        )}

        {currentSlide === 2 && (
          <div className="space-y-2">
            <div className="font-black" style={{ fontSize: '1.8rem' }}>
              🧠 Quiz
            </div>
            <div className="opacity-70" style={{ fontSize: '0.9rem' }}>Memory Question</div>
          </div>
        )}
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-3 flex gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`rounded-full transition-all ${idx === currentSlide ? 'w-6 h-1.5' : 'w-1.5 h-1.5'}`}
            style={{
              backgroundColor: idx === currentSlide ? theme.accentColor : `${theme.accentColor}80`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const TVDisplayControlPanel = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([
    { id: 1, type: 'greeting', title: 'Welcome' },
    { id: 2, type: 'activities', title: 'Today\'s Activities' },
    { id: 3, type: 'quiz', title: 'Memory Quiz' }
  ]);

  // Display settings
  const [autoPlay, setAutoPlay] = useState(true);
  const [slideInterval, setSlideInterval] = useState(15);
  const [transitionType, setTransitionType] = useState('fade');

  // Customization settings
  const [colorScheme, setColorScheme] = useState('purple');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [textSize, setTextSize] = useState(100);
  const [particleEffect, setParticleEffect] = useState(true);
  const [enableGlassmorphism, setEnableGlassmorphism] = useState(true);
  const [backgroundBlur, setBackgroundBlur] = useState(30);

  // Content settings
  const [greetingText, setGreetingText] = useState('Welcome to Our Care Home');
  const [showSpecialDays, setShowSpecialDays] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [enableQuiz, setEnableQuiz] = useState(true);

  // Advanced features
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedSection, setExpandedSection] = useState('display');

  // Deep typography customization
  const [fontFamily, setFontFamily] = useState('sans');
  const [fontWeight, setFontWeight] = useState(700);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [textTransform, setTextTransform] = useState('none');

  // Deep color customization
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#a855f7');
  const [accentColor, setAccentColor] = useState('#ec4899');
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');

  // Spacing and layout
  const [elementSpacing, setElementSpacing] = useState(24);
  const [borderRadius, setBorderRadius] = useState(16);
  const [elementPadding, setElementPadding] = useState(20);
  const [contentWidth, setContentWidth] = useState(100);

  // Visual effects depth
  const [shadowIntensity, setShadowIntensity] = useState(0.5);
  const [glowIntensity, setGlowIntensity] = useState(0.3);
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderOpacity, setBorderOpacity] = useState(0.3);
  const [backdropIntensity, setBackdropIntensity] = useState(0.5);

  // Animation depth
  const [animationDuration, setAnimationDuration] = useState(0.5);
  const [animationDelay, setAnimationDelay] = useState(0.1);
  const [particleCount, setParticleCount] = useState(15);
  const [particleSize, setParticleSize] = useState(2);
  const [particleOpacity, setParticleOpacity] = useState(0.6);

  // Slide-specific customization
  const [slideCustomizations, setSlideCustomizations] = useState({
    1: { colorScheme: 'purple', textSize: 100 },
    2: { colorScheme: 'green', textSize: 100 },
    3: { colorScheme: 'orange', textSize: 100 }
  });

  const colorSchemes = [
    { name: 'Purple Dream', value: 'purple', gradient: 'from-indigo-900 via-purple-900 to-pink-900' },
    { name: 'Ocean Blue', value: 'blue', gradient: 'from-slate-900 via-blue-900 to-cyan-900' },
    { name: 'Forest Green', value: 'green', gradient: 'from-slate-900 via-emerald-900 to-teal-900' },
    { name: 'Sunset Orange', value: 'orange', gradient: 'from-slate-900 via-amber-900 to-orange-900' },
    { name: 'Rose Gold', value: 'rose', gradient: 'from-slate-900 via-rose-900 to-pink-900' },
    { name: 'Midnight', value: 'midnight', gradient: 'from-slate-900 via-slate-800 to-slate-900' }
  ];

  const transitionTypes = ['Fade', 'Slide', 'Zoom', 'Rotate', 'Blur'];

  const handleAddSlide = () => {
    const newSlide = {
      id: Math.max(...slides.map(s => s.id), 0) + 1,
      type: 'custom',
      title: 'New Slide'
    };
    setSlides([...slides, newSlide]);
  };

  const handleDeleteSlide = (id) => {
    if (slides.length > 1) {
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  const handleMoveSlide = (id, direction) => {
    const idx = slides.findIndex(s => s.id === id);
    if (direction === 'up' && idx > 0) {
      const newSlides = [...slides];
      [newSlides[idx], newSlides[idx - 1]] = [newSlides[idx - 1], newSlides[idx]];
      setSlides(newSlides);
    } else if (direction === 'down' && idx < slides.length - 1) {
      const newSlides = [...slides];
      [newSlides[idx], newSlides[idx + 1]] = [newSlides[idx + 1], newSlides[idx]];
      setSlides(newSlides);
    }
  };

  const startDisplay = () => {
    const tvWindow = window.open('/tv-display', 'tvdisplay', 'fullscreen=yes');
    if (tvWindow) {
      tvWindow.focus();
      setTimeout(() => {
        tvWindow.requestFullscreen?.();
      }, 500);
    }
  };

  const SectionToggle = ({ title, section, icon }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === section ? null : section)}
      className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-indigo-50 hover:to-purple-50 rounded-lg transition-all duration-300 border border-gray-200 hover:border-indigo-300 text-gray-900 font-semibold text-lg"
    >
      <Icon name={icon} size={24} />
      <span className="flex-1 text-left">{title}</span>
      <Icon
        name={expandedSection === section ? 'ChevronUp' : 'ChevronDown'}
        size={20}
        className="transition-transform"
      />
    </button>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900">
                  📺 TV Display Control Panel
                </h1>
                <p className="text-gray-600 text-sm mt-2">Live Preview • Ultimate Customization</p>
              </div>
            </div>
          </div>

          {/* Main Layout: Controls + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panels */}
            <div className="lg:col-span-2 space-y-6">
          {/* Display Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Display Settings" section="display" icon="Settings" />
            {expandedSection === 'display' && (
              <div className="p-6 space-y-6 border-t border-gray-200">
                {/* Auto-play toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-semibold text-lg text-gray-900">Auto-play Slides</p>
                    <p className="text-sm text-gray-600">Slides advance automatically</p>
                  </div>
                  <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                      autoPlay ? 'bg-emerald-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                        autoPlay ? 'translate-x-10' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Slide interval */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-lg">Slide Duration</p>
                    <span className="text-2xl font-bold text-indigo-400">{slideInterval}s</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="60"
                    value={slideInterval}
                    onChange={(e) => setSlideInterval(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-sm text-slate-400 mt-2">Each slide displays for {slideInterval} seconds</p>
                </div>

                {/* Transition type */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-semibold text-lg mb-4">Transition Effect</p>
                  <div className="grid grid-cols-2 gap-3">
                    {transitionTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setTransitionType(type.toLowerCase())}
                        className={`py-3 px-4 rounded-lg font-semibold transition-all duration-300 border ${
                          transitionType === type.toLowerCase()
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white scale-105'
                            : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customization Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Visual Customization" section="visual" icon="Palette" />
            {expandedSection === 'visual' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Color Scheme */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-semibold text-lg mb-4">Color Scheme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {colorSchemes.map((scheme) => (
                      <button
                        key={scheme.value}
                        onClick={() => setColorScheme(scheme.value)}
                        className={`p-4 rounded-xl font-semibold transition-all duration-300 border ${
                          colorScheme === scheme.value
                            ? 'border-2 border-indigo-400 scale-105 shadow-lg shadow-indigo-500/50'
                            : 'border border-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className={`h-8 rounded-lg bg-gradient-to-r ${scheme.gradient} mb-2`}></div>
                        <span className="text-sm">{scheme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deep Color Customization */}
                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-semibold text-lg">Custom Color Palette</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Primary Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-white/20"
                        />
                        <span className="text-xs text-slate-400 font-mono">{primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Secondary Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-white/20"
                        />
                        <span className="text-xs text-slate-400 font-mono">{secondaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Accent Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-white/20"
                        />
                        <span className="text-xs text-slate-400 font-mono">{accentColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Text Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-white/20"
                        />
                        <span className="text-xs text-slate-400 font-mono">{textColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shadow and Glow */}
                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-semibold text-lg">Shadow & Glow Effects</p>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-300">Shadow Intensity</label>
                      <span className="text-sm font-bold text-indigo-400">{(shadowIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={shadowIntensity}
                      onChange={(e) => setShadowIntensity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg accent-indigo-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-300">Glow Intensity</label>
                      <span className="text-sm font-bold text-purple-400">{(glowIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={glowIntensity}
                      onChange={(e) => setGlowIntensity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg accent-purple-600"
                    />
                  </div>
                </div>

                {/* Border Customization */}
                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-semibold text-lg">Border Styling</p>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-300">Border Width</label>
                      <span className="text-sm font-bold text-cyan-400">{borderWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Number(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-300">Border Opacity</label>
                      <span className="text-sm font-bold text-teal-400">{(borderOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={borderOpacity}
                      onChange={(e) => setBorderOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg accent-teal-600"
                    />
                  </div>
                </div>

                {/* Backdrop Blur */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Backdrop Blur Intensity</label>
                    <span className="text-sm font-bold text-emerald-400">{(backdropIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={backdropIntensity}
                    onChange={(e) => setBackdropIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-emerald-600"
                  />
                </div>

                {/* Animation Speed */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-lg">Animation Speed</p>
                    <span className="text-2xl font-bold text-purple-400">{(animationSpeed * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <p className="text-sm text-slate-400 mt-2">
                    {animationSpeed < 1 ? 'Slow' : animationSpeed === 1 ? 'Normal' : 'Fast'} animations
                  </p>
                </div>

                {/* Text Size */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-lg">Text Size</p>
                    <span className="text-2xl font-bold text-blue-400">{textSize}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="150"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-sm text-slate-400 mt-2">Adjust text size for better readability</p>
                </div>

                {/* Background Blur */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-lg">Background Blur Effect</p>
                    <span className="text-2xl font-bold text-pink-400">{backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={backgroundBlur}
                    onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <p className="text-sm text-slate-400 mt-2">Increase blur for more dramatic effect</p>
                </div>

                {/* Feature Toggles */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setParticleEffect(!particleEffect)}
                    className={`p-4 rounded-lg font-semibold transition-all border ${
                      particleEffect
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400'
                        : 'bg-white/5 border-white/20 text-slate-400'
                    }`}
                  >
                    {particleEffect ? '✨' : '⭘'} Particle Effects
                  </button>
                  <button
                    onClick={() => setEnableGlassmorphism(!enableGlassmorphism)}
                    className={`p-4 rounded-lg font-semibold transition-all border ${
                      enableGlassmorphism
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400'
                        : 'bg-white/5 border-white/20 text-slate-400'
                    }`}
                  >
                    {enableGlassmorphism ? '🔮' : '⭘'} Glassmorphism
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Content Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Content Settings" section="content" icon="FileText" />
            {expandedSection === 'content' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Greeting text */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block font-semibold text-lg mb-3">Greeting Message</label>
                  <input
                    type="text"
                    value={greetingText}
                    onChange={(e) => setGreetingText(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Enter greeting message"
                  />
                </div>

                {/* Feature toggles */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <button
                      onClick={() => setShowSpecialDays(!showSpecialDays)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        showSpecialDays ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          showSpecialDays ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="font-semibold">Show Special Days</p>
                      <p className="text-sm text-slate-400">Highlight birthdays and holidays</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <button
                      onClick={() => setShowTime(!showTime)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        showTime ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          showTime ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="font-semibold">Show Time & Date</p>
                      <p className="text-sm text-slate-400">Display current time and date</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <button
                      onClick={() => setEnableQuiz(!enableQuiz)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        enableQuiz ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          enableQuiz ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="font-semibold">Enable Quiz Slide</p>
                      <p className="text-sm text-slate-400">Show memory quiz in rotation</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Typography Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Typography & Fonts" section="typography" icon="Type" />
            {expandedSection === 'typography' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Font Family */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block font-semibold text-lg mb-4">Font Family</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Sans Serif', value: 'sans' },
                      { name: 'Serif', value: 'serif' },
                      { name: 'Mono', value: 'mono' },
                      { name: 'Display', value: 'display' }
                    ].map((font) => (
                      <button
                        key={font.value}
                        onClick={() => setFontFamily(font.value)}
                        className={`py-3 px-4 rounded-lg transition-all border ${
                          fontFamily === font.value
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Weight */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Font Weight</label>
                    <span className="text-sm font-bold text-indigo-400">{fontWeight}</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="900"
                    step="100"
                    value={fontWeight}
                    onChange={(e) => setFontWeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-indigo-600"
                  />
                </div>

                {/* Letter Spacing */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Letter Spacing</label>
                    <span className="text-sm font-bold text-purple-400">{letterSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="5"
                    step="0.5"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-purple-600"
                  />
                </div>

                {/* Line Height */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Line Height</label>
                    <span className="text-sm font-bold text-pink-400">{lineHeight.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-pink-600"
                  />
                </div>

                {/* Text Transform */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block font-semibold text-lg mb-3">Text Transform</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'None', value: 'none' },
                      { name: 'Uppercase', value: 'uppercase' },
                      { name: 'Lowercase', value: 'lowercase' },
                      { name: 'Capitalize', value: 'capitalize' }
                    ].map((transform) => (
                      <button
                        key={transform.value}
                        onClick={() => setTextTransform(transform.value)}
                        className={`py-2 px-3 text-sm rounded-lg transition-all border ${
                          textTransform === transform.value
                            ? 'bg-purple-600 border-purple-400'
                            : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {transform.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacing & Layout */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Spacing & Layout" section="spacing" icon="Layout" />
            {expandedSection === 'spacing' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Element Spacing */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Element Spacing</label>
                    <span className="text-sm font-bold text-cyan-400">{elementSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    step="4"
                    value={elementSpacing}
                    onChange={(e) => setElementSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-600"
                  />
                </div>

                {/* Border Radius */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Border Radius</label>
                    <span className="text-sm font-bold text-teal-400">{borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-teal-600"
                  />
                </div>

                {/* Element Padding */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Element Padding</label>
                    <span className="text-sm font-bold text-lime-400">{elementPadding}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    step="2"
                    value={elementPadding}
                    onChange={(e) => setElementPadding(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-lime-600"
                  />
                </div>

                {/* Content Width */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Content Width</label>
                    <span className="text-sm font-bold text-orange-400">{contentWidth}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    step="5"
                    value={contentWidth}
                    onChange={(e) => setContentWidth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-orange-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Animation Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Advanced Animations" section="animations" icon="Zap" />
            {expandedSection === 'animations' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Animation Duration */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Animation Duration</label>
                    <span className="text-sm font-bold text-indigo-400">{animationDuration.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={animationDuration}
                    onChange={(e) => setAnimationDuration(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-indigo-600"
                  />
                </div>

                {/* Animation Delay */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Animation Delay Between Elements</label>
                    <span className="text-sm font-bold text-purple-400">{animationDelay.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={animationDelay}
                    onChange={(e) => setAnimationDelay(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-purple-600"
                  />
                </div>

                {/* Particle Count */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Particle Count</label>
                    <span className="text-sm font-bold text-pink-400">{particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-pink-600"
                  />
                </div>

                {/* Particle Size */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Particle Size</label>
                    <span className="text-sm font-bold text-cyan-400">{particleSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={particleSize}
                    onChange={(e) => setParticleSize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-600"
                  />
                </div>

                {/* Particle Opacity */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Particle Opacity</label>
                    <span className="text-sm font-bold text-teal-400">{(particleOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={particleOpacity}
                    onChange={(e) => setParticleOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-teal-600"
                  />
                </div>

                {/* Animation Easing Presets */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block font-semibold text-lg mb-3">Animation Easing Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Linear', 'Ease-in', 'Ease-out', 'Ease-in-out', 'Cubic', 'Spring'].map((preset) => (
                      <button
                        key={preset}
                        className="py-2 px-3 text-xs bg-white/5 border border-white/20 hover:bg-indigo-600/30 hover:border-indigo-400 rounded-lg transition-all"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Visual Effects */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SectionToggle title="Visual Effects Pro" section="vfx" icon="Sparkles" />
            {expandedSection === 'vfx' && (
              <div className="p-6 space-y-6 border-t border-white/10">
                {/* Blur Radius */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Element Blur</label>
                    <span className="text-sm font-bold text-blue-400">{backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={backgroundBlur}
                    onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-blue-600"
                  />
                </div>

                {/* Shadow Depth */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Shadow Depth</label>
                    <span className="text-sm font-bold text-purple-400">{(shadowIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={shadowIntensity}
                    onChange={(e) => setShadowIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-purple-600"
                  />
                </div>

                {/* Glow Intensity */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Neon Glow Effect</label>
                    <span className="text-sm font-bold text-cyan-400">{(glowIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-600"
                  />
                </div>

                {/* Saturation Control */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Color Saturation</label>
                    <span className="text-sm font-bold text-pink-400">100%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="10"
                    defaultValue="100"
                    className="w-full h-2 bg-slate-600 rounded-lg accent-pink-600"
                  />
                </div>

                {/* Brightness */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Display Brightness</label>
                    <span className="text-sm font-bold text-yellow-400">100%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="10"
                    defaultValue="100"
                    className="w-full h-2 bg-slate-600 rounded-lg accent-yellow-600"
                  />
                </div>

                {/* Contrast */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-300">Display Contrast</label>
                    <span className="text-sm font-bold text-orange-400">100%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="10"
                    defaultValue="100"
                    className="w-full h-2 bg-slate-600 rounded-lg accent-orange-600"
                  />
                </div>

                {/* Filter Presets */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block font-semibold text-lg mb-3">Visual Filters</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Vivid', 'Dark Mode', 'Pastel', 'Monochrome', 'Sepia', 'Cool Tone', 'Warm Tone', 'High Contrast'].map((filter) => (
                      <button
                        key={filter}
                        className="py-2 px-3 text-xs bg-white/5 border border-white/20 hover:bg-purple-600/30 hover:border-purple-400 rounded-lg transition-all"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel - Right Side */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sticky top-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">📺 Live Preview</h2>
            <TVDisplayPreview
              customizations={{
                colorScheme,
                textSize,
                letterSpacing,
                fontWeight,
                backgroundBlur,
                borderRadius
              }}
              autoPlay={autoPlay}
              slideInterval={slideInterval}
            />
          </div>
        </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default TVDisplayControlPanel;
