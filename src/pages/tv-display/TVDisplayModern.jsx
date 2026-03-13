import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';

// Modern Theme Presets with Beautiful Gradients
const THEME_PRESETS = {
  modern: {
    gradient: 'from-slate-200 via-purple-200 to-slate-100',
    accentColor: '#8b5cf6',
    colors: ['rgba(139, 92, 246, 0.6)', 'rgba(168, 85, 247, 0.6)', 'rgba(217, 70, 239, 0.6)'],
  },
  vibrant: {
    gradient: 'from-orange-200 via-red-200 to-pink-100',
    accentColor: '#f97316',
    colors: ['rgba(249, 115, 22, 0.6)', 'rgba(239, 68, 68, 0.6)', 'rgba(236, 72, 153, 0.6)'],
  },
  elegant: {
    gradient: 'from-amber-100 via-yellow-100 to-amber-50',
    accentColor: '#f59e0b',
    colors: ['rgba(245, 158, 11, 0.6)', 'rgba(251, 191, 36, 0.6)', 'rgba(252, 211, 77, 0.6)'],
  },
  ocean: {
    gradient: 'from-cyan-200 via-blue-200 to-teal-100',
    accentColor: '#06b6d4',
    colors: ['rgba(6, 182, 212, 0.6)', 'rgba(14, 165, 233, 0.6)', 'rgba(34, 211, 238, 0.6)'],
  },
  forest: {
    gradient: 'from-emerald-200 via-green-200 to-teal-100',
    accentColor: '#10b981',
    colors: ['rgba(16, 185, 129, 0.6)', 'rgba(52, 211, 153, 0.6)', 'rgba(110, 231, 183, 0.6)'],
  },
  sunset: {
    gradient: 'from-rose-200 via-orange-200 to-yellow-100',
    accentColor: '#f59e0b',
    colors: ['rgba(249, 115, 22, 0.6)', 'rgba(251, 146, 60, 0.6)', 'rgba(251, 191, 36, 0.6)'],
  },
  deep: {
    gradient: 'from-indigo-300 via-purple-300 to-indigo-200',
    accentColor: '#6366f1',
    colors: ['rgba(99, 102, 241, 0.6)', 'rgba(129, 140, 248, 0.6)', 'rgba(165, 180, 252, 0.6)'],
  },
  pastel: {
    gradient: 'from-pink-200 via-purple-200 to-blue-200',
    accentColor: '#a855f7',
    colors: ['rgba(168, 85, 247, 0.6)', 'rgba(192, 132, 252, 0.6)', 'rgba(216, 180, 254, 0.6)'],
  },
  neon: {
    gradient: 'from-gray-200 via-purple-200 to-gray-100',
    accentColor: '#22c55e',
    colors: ['rgba(34, 197, 94, 0.6)', 'rgba(74, 222, 128, 0.6)', 'rgba(134, 239, 172, 0.6)'],
  },
  cyberpunk: {
    gradient: 'from-fuchsia-300 via-cyan-300 to-fuchsia-200',
    accentColor: '#d946ef',
    colors: ['rgba(217, 70, 239, 0.6)', 'rgba(34, 211, 238, 0.6)', 'rgba(232, 121, 249, 0.6)'],
  },
  candy: {
    gradient: 'from-pink-200 via-rose-200 to-pink-100',
    accentColor: '#ec4899',
    colors: ['rgba(236, 72, 153, 0.6)', 'rgba(244, 114, 182, 0.6)', 'rgba(251, 207, 232, 0.6)'],
  },
  rainbow: {
    gradient: 'from-purple-200 via-pink-200 to-orange-200',
    accentColor: '#f59e0b',
    colors: ['rgba(168, 85, 247, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(251, 146, 60, 0.6)'],
  },
  tropical: {
    gradient: 'from-lime-200 via-emerald-200 to-cyan-200',
    accentColor: '#84cc16',
    colors: ['rgba(132, 204, 22, 0.6)', 'rgba(52, 211, 153, 0.6)', 'rgba(34, 211, 238, 0.6)'],
  },
  cosmic: {
    gradient: 'from-purple-300 via-indigo-300 to-purple-200',
    accentColor: '#8b5cf6',
    colors: ['rgba(139, 92, 246, 0.6)', 'rgba(99, 102, 241, 0.6)', 'rgba(192, 132, 252, 0.6)'],
  },
  fire: {
    gradient: 'from-red-300 via-orange-300 to-yellow-200',
    accentColor: '#ef4444',
    colors: ['rgba(239, 68, 68, 0.6)', 'rgba(249, 115, 22, 0.6)', 'rgba(251, 191, 36, 0.6)'],
  },
  snow: {
    gradient: 'from-blue-200 via-cyan-200 to-slate-100',
    accentColor: '#0ea5e9',
    colors: ['rgba(14, 165, 233, 0.6)', 'rgba(34, 211, 238, 0.6)', 'rgba(186, 230, 253, 0.6)'],
  },
  aurora: {
    gradient: 'from-green-200 via-cyan-200 to-purple-200',
    accentColor: '#14b8a6',
    colors: ['rgba(20, 184, 166, 0.6)', 'rgba(34, 211, 238, 0.6)', 'rgba(168, 85, 247, 0.6)'],
  },
  disco: {
    gradient: 'from-purple-200 via-pink-200 to-purple-100',
    accentColor: '#ec4899',
    colors: ['rgba(168, 85, 247, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(244, 114, 182, 0.6)'],
  },
  gaming: {
    gradient: 'from-slate-300 via-lime-200 to-slate-200',
    accentColor: '#84cc16',
    colors: ['rgba(132, 204, 22, 0.6)', 'rgba(163, 230, 53, 0.6)', 'rgba(190, 242, 100, 0.6)'],
  },
  bloom: {
    gradient: 'from-rose-200 via-pink-200 to-orange-200',
    accentColor: '#f43f5e',
    colors: ['rgba(244, 63, 94, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(251, 146, 60, 0.6)'],
  },
  jungle: {
    gradient: 'from-green-300 via-amber-200 to-green-200',
    accentColor: '#22c55e',
    colors: ['rgba(34, 197, 94, 0.6)', 'rgba(132, 204, 22, 0.6)', 'rgba(52, 211, 153, 0.6)'],
  },
  lavender: {
    gradient: 'from-purple-200 via-pink-200 to-blue-200',
    accentColor: '#a855f7',
    colors: ['rgba(168, 85, 247, 0.6)', 'rgba(192, 132, 252, 0.6)', 'rgba(216, 180, 254, 0.6)'],
  },
  mint: {
    gradient: 'from-green-200 via-cyan-200 to-blue-200',
    accentColor: '#14b8a6',
    colors: ['rgba(20, 184, 166, 0.6)', 'rgba(34, 211, 238, 0.6)', 'rgba(103, 232, 249, 0.6)'],
  },
  cherry: {
    gradient: 'from-pink-200 via-rose-200 to-red-200',
    accentColor: '#f43f5e',
    colors: ['rgba(244, 63, 94, 0.6)', 'rgba(251, 113, 133, 0.6)', 'rgba(252, 165, 165, 0.6)'],
  },
};

// Floating Particles Component
const FloatingParticles = ({ colors, count = 20 }) => (
  <div className="pointer-events-none">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: Math.random() * 20 + 10,
          height: Math.random() * 20 + 10,
          background: `radial-gradient(circle, ${colors[i % colors.length]}, transparent)`,
        }}
        initial={{ 
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920), 
          y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
          scale: Math.random() * 0.5 + 0.5
        }}
        animate={{ 
          y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)],
          x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920)],
          scale: [null, Math.random() * 1.5 + 0.5],
          rotate: [0, 360]
        }}
        transition={{ 
          duration: Math.random() * 15 + 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

// Reusable SVG Analog Clock for DateTimeSlide
const AnalogClock = ({ dateTime, size = 200, accentColor = '#ffffff' }) => {
  const seconds = dateTime.getSeconds();
  const minutes = dateTime.getMinutes();
  const hours = dateTime.getHours() % 12;
  const secDeg = seconds * 6;
  const minDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;
  const c = size / 2;
  const r = c - 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <circle cx={c} cy={c} r={r} fill="#ffffff" stroke={accentColor} strokeWidth="4" />
      {[...Array(12)].map((_, i) => {
        const ang = i * 30;
        const x1 = c + Math.sin((ang * Math.PI) / 180) * (r - 8);
        const y1 = c - Math.cos((ang * Math.PI) / 180) * (r - 8);
        const x2 = c + Math.sin((ang * Math.PI) / 180) * r;
        const y2 = c - Math.cos((ang * Math.PI) / 180) * r;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accentColor} strokeWidth={i % 3 === 0 ? 3 : 1} strokeOpacity="0.9" />
        );
      })}

      <line x1={c} y1={c} x2={c} y2={c - r * 0.5} stroke={accentColor} strokeWidth="8" transform={`rotate(${hourDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c} x2={c} y2={c - r * 0.75} stroke={accentColor} strokeWidth="6" transform={`rotate(${minDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c + r * 0.15} x2={c} y2={c - r * 0.95} stroke="#ef4444" strokeWidth="3" transform={`rotate(${secDeg} ${c} ${c})`} strokeLinecap="round" />
      <circle cx={c} cy={c} r="5" fill={accentColor} />
    </svg>
  );
};

// Animated Geometric Shapes
const AnimatedShapes = ({ accentColor }) => (
  <div className="pointer-events-none">
    {[...Array(6)].map((_, i) => {
      const shapeColors = [
        'rgba(99,102,241,0.1)', 'rgba(236,72,153,0.1)', 
        'rgba(59,130,246,0.1)', 'rgba(168,85,247,0.1)', 
        'rgba(251,146,60,0.1)', 'rgba(34,197,94,0.1)'
      ];
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            borderRadius: i % 3 === 0 ? '50%' : Math.random() * 30,
            background: `linear-gradient(135deg, ${shapeColors[i % 6]}, transparent)`,
            border: `2px solid ${shapeColors[i % 6].replace('0.1', '0.3')}`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 200 - 100, 0],
            y: [0, Math.random() * 200 - 100, 0],
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: Math.random() * 20 + 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5
          }}
        />
      );
    })}
  </div>
);

// Gradient Orbs
const GradientOrbs = () => (
  <div className="pointer-events-none">
    <motion.div 
      className="absolute top-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl"
      animate={{ 
        scale: [1, 1.3, 1],
        opacity: [0.4, 0.6, 0.4],
        x: [0, 50, 0],
        y: [0, 30, 0]
      }}
      transition={{ 
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div 
      className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/30 to-orange-400/30 rounded-full blur-3xl"
      animate={{ 
        scale: [1.3, 1, 1.3],
        opacity: [0.6, 0.4, 0.6],
        x: [0, -50, 0],
        y: [0, -30, 0]
      }}
      transition={{ 
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div 
      className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
      animate={{ 
        scale: [1, 1.4, 1],
        opacity: [0.3, 0.5, 0.3],
        rotate: [0, 180, 360]
      }}
      transition={{ 
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </div>
);

// Sparkle Effects
const SparkleEffects = () => (
  <div className="pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={`sparkle-${i}`}
        className="absolute w-2 h-2 bg-white rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          scale: [0, 1.5, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: Math.random() * 2 + 1,
          repeat: Infinity,
          delay: Math.random() * 3,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

// Modern Slide Content Component
const ModernSlideContent = ({ slide, accentColor }) => {
  // YouTube Video Style - Embedded YouTube player
  if (slide.displayStyle === 'youtube-video' && slide.youtubeUrl) {
    // Extract video ID
    const getVideoId = (url) => {
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
      if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
      return null;
    };
    
    const videoId = getVideoId(slide.youtubeUrl);
    
    if (!videoId) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">⚠️</div>
          <p className="text-4xl text-gray-700">Invalid YouTube URL</p>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.6 }}
        className="w-full h-full flex flex-col items-center justify-center"
      >
        {/* Video Title */}
        {slide.content && slide.content !== 'YouTube Video' && (
          <motion.h2
            className="text-4xl font-bold text-gray-800 mb-6 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {slide.content}
          </motion.h2>
        )}
        
        {/* YouTube Embed */}
        <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1`}
            title={slide.content || 'YouTube Video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        
        {/* Frozen indicator if applicable */}
        {slide.frozen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 px-6 py-2 bg-cyan-500/20 backdrop-blur-sm rounded-full text-cyan-700 font-medium flex items-center gap-2"
          >
            ❄️ Slide Frozen - Video will continue playing
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Date/Time Style - Animated date and time display
  if (slide.displayStyle === 'date-time') {
    return <DateTimeSlide accentColor={accentColor} />;
  }

  // Big Icon Style - Large centered icon with text
  if (slide.displayStyle === 'big-icon') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotateY: -30 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.5, rotateY: 30 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="text-center space-y-12"
      >
        {/* Radiating rings behind icon */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 rounded-full"
            style={{ borderColor: `${accentColor}30` }}
            animate={{
              scale: [1, 2.5, 2.5],
              opacity: [0.6, 0, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut"
            }}
          />
        ))}

        <motion.div
          className="text-9xl drop-shadow-2xl relative z-10"
          animate={{ 
            rotate: [0, 10, -10, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {slide.icon}
        </motion.div>

        <motion.div
          className="font-black text-8xl text-gray-800 drop-shadow-lg relative z-10"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {slide.content}
        </motion.div>

        {slide.subtitle && (
          <motion.div
            className="text-gray-700 text-5xl drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {slide.subtitle}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Title Style - Prominent title card
  if (slide.displayStyle === 'title') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotateX: 20 }}
        transition={{ duration: 1, type: "spring", stiffness: 150 }}
        className="text-center space-y-16"
      >
        <motion.div
          className="text-7xl drop-shadow-lg"
          animate={{ 
            rotate: 360,
            scale: [1, 1.15, 1]
          }}
          transition={{ 
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {slide.icon}
        </motion.div>

        <motion.h1
          className="font-black text-9xl text-gray-800 drop-shadow-xl leading-tight"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{
            backgroundSize: '200% 200%',
            backgroundImage: `linear-gradient(90deg, #374151, ${accentColor}, #374151)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          {slide.content}
        </motion.h1>

        {slide.subtitle && (
          <motion.p
            className="text-gray-700 text-5xl drop-shadow-md"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </motion.div>
    );
  }

  // List Style - Activities with times
  if (slide.displayStyle === 'list') {
    const items = slide.subtitle ? slide.subtitle.split('\n').filter(Boolean) : [];
    return (
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.8 }}
        className="space-y-12 w-full max-w-5xl"
      >
        <motion.div
          className="text-center space-y-8 mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="text-8xl drop-shadow-lg"
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {slide.icon}
          </motion.div>
          <h2 className="text-7xl font-black text-gray-800 drop-shadow-lg">{slide.content}</h2>
        </motion.div>

        <div className="space-y-6">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -100, rotateY: -20 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ 
                delay: 0.3 + index * 0.15,
                duration: 0.8,
                type: "spring",
                stiffness: 100
              }}
              className="flex items-center gap-8 bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/60 relative overflow-hidden"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: index * 0.5,
                  repeatDelay: 2
                }}
              />

              <motion.div
                className="text-5xl font-bold text-gray-800 relative z-10"
                animate={{
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.2
                }}
              >
                {item}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Full Width Style - Banner style
  if (slide.displayStyle === 'full-width') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center space-y-10"
      >
        <motion.div
          className="text-9xl drop-shadow-2xl"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          {slide.icon}
        </motion.div>

        <motion.div
          className="font-black text-9xl text-gray-800 drop-shadow-xl px-16"
          animate={{
            scale: [1, 1.03, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {slide.content}
        </motion.div>

        {slide.subtitle && (
          <motion.div
            className="text-gray-700 text-6xl drop-shadow-md max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {slide.subtitle}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Default Centered Style
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotateY: -20 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.5, rotateY: 20 }}
      transition={{ duration: 1, type: "spring", stiffness: 120 }}
      className="text-center space-y-12"
    >
      <motion.div
        className="text-9xl drop-shadow-2xl"
        animate={{ 
          rotate: [0, 360],
          y: [0, -20, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {slide.icon}
      </motion.div>

      <motion.div
        className="font-black text-9xl text-gray-800 drop-shadow-lg"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {slide.content}
      </motion.div>

      {slide.subtitle && (
        <motion.div
          className="text-gray-700 opacity-90 text-5xl drop-shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {slide.subtitle}
        </motion.div>
      )}
    </motion.div>
  );
};

// DateTimeSlide component for date/day/time display
const DateTimeSlide = ({ accentColor }) => {
  const [dateTime, setDateTime] = useState(new Date());

  const [isCompact, setIsCompact] = useState(false);
  const [isLarge, setIsLarge] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsCompact(h < 700 || w < 900);
      setIsLarge(w >= 1600 || h >= 1000);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = dateTime.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const dayName = dateTime.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = dateTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.8 }}
      className={`text-center ${isCompact ? 'space-y-4 pt-6 pb-36' : isLarge ? 'space-y-8 pt-20 pb-56' : 'space-y-6 pt-12 pb-44'}`}
      style={{ maxWidth: '100%', boxSizing: 'border-box' }}
    >
      {/* Greeting with Sun emoji */}
      <motion.div
        animate={{ 
          rotate: [0, 10, -10, 0],
          y: [0, isCompact ? -4 : -6, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`${isCompact ? 'text-5xl' : isLarge ? 'text-9xl' : 'text-7xl'} drop-shadow-2xl`}
      >
        ☀️
      </motion.div>

      {/* Greeting Text */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`${isCompact ? 'text-5xl' : isLarge ? 'text-9xl' : 'text-8xl'} font-black drop-shadow-xl`}
        style={{ color: accentColor }}
      >
        {greeting}
      </motion.h1>

      {/* Day of Week */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${isCompact ? 'text-3xl' : isLarge ? 'text-7xl' : 'text-6xl'} font-bold drop-shadow-lg`}
        style={{ color: accentColor }}
      >
        {dayName}
      </motion.div>

      {/* Full Date */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`${isCompact ? 'text-xl' : isLarge ? 'text-6xl' : 'text-5xl'} font-semibold text-gray-800 drop-shadow-md`}
      >
        {dateStr}
      </motion.div>

      {/* Analog Clock */}
      <div className="mt-6">
        <AnalogClock dateTime={dateTime} size={isCompact ? 120 : isLarge ? 320 : 220} accentColor={accentColor} />
      </div>

      {/* Time Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
        className={isCompact ? 'inline-block bg-white/90 backdrop-blur-md rounded-3xl px-4 py-2 shadow-2xl border-4' : isLarge ? 'inline-block bg-white/90 backdrop-blur-md rounded-3xl px-12 py-6 shadow-2xl border-4' : 'inline-block bg-white/90 backdrop-blur-md rounded-3xl px-8 py-4 shadow-2xl border-4'}
        style={{ borderColor: accentColor }}
      >
        <motion.div
          className={`${isCompact ? 'text-xl' : isLarge ? 'text-5xl' : 'text-4xl'} font-bold flex items-center gap-4 drop-shadow-lg`}
          style={{ color: accentColor }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className={`${isCompact ? 'text-lg' : isLarge ? 'text-4xl' : 'text-3xl'}`}>🕐</span>
          {timeStr}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Main TV Display Component
const TVDisplayModern = () => {
  const [config, setConfig] = useState({
    selectedTheme: 'modern',
    autoPlay: true,
    slideInterval: 15,
    slides: [
      { id: 1, icon: '👋', content: 'Welcome!', subtitle: '', displayStyle: 'centered' },
      { id: 2, icon: '📅', content: 'Today\'s Activities', subtitle: '', displayStyle: 'title' },
    ],
    showParticles: true,
    particleCount: 20,
    music: {
      enabled: false,
      type: 'youtube',
      playlist: '',
      volume: 50,
    },
  });

  // YouTube player ref and state
  const ytRef = React.useRef(null);
  const [ytReady, setYtReady] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [userStartedMusic, setUserStartedMusic] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState('');
  const [ytMeta, setYtMeta] = useState({ title: '', author: '', thumbnail: '' });
  const [isPlayingIframe, setIsPlayingIframe] = useState(false);

  // Local music state
  const audioRef = useRef(null);
  const [localSongs, setLocalSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);

  // Fullscreen state
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Request fullscreen
  const enterFullscreen = async () => {
    try {
      const elem = containerRef.current || document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      setShowFullscreenPrompt(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Watch for localStorage changes from control panel (live sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tvDisplayConfig' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setConfig(updated);
          // Also update local songs if present
          if (updated.music?.localSongs) {
            setLocalSongs(updated.music.localSongs);
          }
        } catch (err) { console.warn('storage change parse failed', err); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // BroadcastChannel for instant live updates from control panel
  useEffect(() => {
    const channel = new BroadcastChannel('tv-display-sync');
    
    channel.onmessage = (event) => {
      if (event.data?.type === 'CONFIG_UPDATE' && event.data.config) {
        console.log('Live update received:', event.data.config);
        setConfig(event.data.config);
        
        // Update local songs if present
        if (event.data.config.music?.localSongs) {
          setLocalSongs(event.data.config.music.localSongs);
        }
      }
    };
    
    return () => channel.close();
  }, []);

  // auto-capture a user gesture (click) anywhere to start music if enabled
  useEffect(() => {
    if (!config.music || !config.music.enabled) return;
    if (userStartedMusic) return;
    const handler = () => {
      setUserStartedMusic(true);
      try { if (ytRef.current && ytRef.current.playVideo) ytRef.current.playVideo(); } catch (e) {}
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [config.music, userStartedMusic]);

  // Play local music
  useEffect(() => {
    const musicType = config.music?.type || 'youtube';
    if (!config.music?.enabled || musicType !== 'local' || localSongs.length === 0) {
      // Stop any playing audio if conditions not met
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setCurrentSong(null);
        setIsLocalPlaying(false);
      }
      return;
    }

    const playSong = (index) => {
      const song = localSongs[index];
      if (!song) return;
      
      // Use signedUrl if available, otherwise skip
      const songUrl = song.signedUrl || song.url;
      if (!songUrl) {
        console.warn('No URL for song:', song.name);
        // Try next song
        const nextIndex = (index + 1) % localSongs.length;
        if (nextIndex !== index) {
          setTimeout(() => playSong(nextIndex), 100);
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(songUrl);
      audioRef.current.volume = (config.music?.volume || 50) / 100;
      audioRef.current.play().then(() => {
        setIsLocalPlaying(true);
        setCurrentSong(song);
        setCurrentSongIndex(index);
      }).catch(e => {
        console.warn('Autoplay blocked, user interaction required:', e);
        // Set up click handler to start playback
        const clickHandler = () => {
          audioRef.current?.play().then(() => {
            setIsLocalPlaying(true);
            setCurrentSong(song);
            setCurrentSongIndex(index);
          }).catch(() => {});
          document.removeEventListener('click', clickHandler);
        };
        document.addEventListener('click', clickHandler, { once: true });
      });

      audioRef.current.onended = () => {
        // Play next song
        const nextIndex = (index + 1) % localSongs.length;
        setCurrentSongIndex(nextIndex);
        playSong(nextIndex);
      };
    };

    playSong(currentSongIndex);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [config.music?.enabled, config.music?.type, localSongs, currentSongIndex]);

  // Update local music volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = (config.music?.volume || 50) / 100;
    }
  }, [config.music?.volume]);

  // Fetch YouTube oEmbed metadata for a video URL (no API key needed)
  const fetchYtMeta = async (videoOrUrl) => {
    try {
      let videoId = videoOrUrl;
      if (videoOrUrl && videoOrUrl.startsWith('http')) {
        // if passed a playlist url or full url, try extract id
        videoId = extractVideoId(videoOrUrl);
      }
      if (!videoId) return;
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) return;
      const data = await res.json();
      setYtMeta({ title: data.title || '', author: data.author_name || '', thumbnail: data.thumbnail_url || '' });
    } catch (e) {
      // ignore
    }
  };

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('tvDisplayConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        console.log('TVDisplayModern: Loaded config', parsed);
        console.log('Music settings:', parsed.music);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          // Ensure slides array exists and is not empty
          slides: parsed.slides && parsed.slides.length > 0 ? parsed.slides : prev.slides
        }));
        
        // Load local songs if present
        if (parsed.music && parsed.music.localSongs && parsed.music.localSongs.length > 0) {
          console.log('Loading local songs:', parsed.music.localSongs.length);
          setLocalSongs(parsed.music.localSongs);
        }
      } catch (error) {
        console.error('Failed to parse TV display config:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Helpers to extract YouTube playlist or video IDs
  const extractPlaylistId = (input) => {
    if (!input) return '';
    try {
      const url = new URL(input);
      const list = url.searchParams.get('list');
      if (list) return list;
    } catch (e) {}
    if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;
    return '';
  };

  const extractVideoId = (input) => {
    if (!input) return '';
    try {
      const url = new URL(input);
      if (url.hostname.includes('youtu.be')) {
        return url.pathname.slice(1);
      }
      if (url.searchParams.get('v')) return url.searchParams.get('v');
    } catch (e) {}
    // raw id
    if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;
    return '';
  };

  // YouTube Player component (embedded, hidden) - supports playlist or single video
  const YouTubePlayer = ({ source, volume, onReady, onStateChange }) => {
    const playerRef = React.useRef(null);
    const containerRef = React.useRef(null);

    useEffect(() => {
      const playlistId = extractPlaylistId(source);
      const videoId = extractVideoId(source);
      if (!playlistId && !videoId) return;

      const ensureAPI = () => {
        if (window.__YT_API_PROMISE__) return window.__YT_API_PROMISE__;
        window.__YT_API_PROMISE__ = new Promise((resolve) => {
          if (window.YT && window.YT.Player) return resolve(window.YT);
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
          const prev = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (typeof prev === 'function') try { prev(); } catch (e) {}
            resolve(window.YT);
          };
        });
        return window.__YT_API_PROMISE__;
      };

      // guard: if we've already created a container for this component instance, skip
      if (containerRef.current) {
        console.log('YouTubePlayer: container already exists, skipping init');
        return;
      }

      // create a dedicated container outside React's managed DOM with a unique id
      const container = document.createElement('div');
      const uid = `yt-player-container-${Date.now()}-${Math.floor(Math.random()*10000)}`;
      container.id = uid;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '0px';
      container.style.height = '0px';
      document.body.appendChild(container);
      containerRef.current = container;

      let mounted = true;

      ensureAPI().then((YT) => {
        if (!mounted) return;
        try { if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy(); } catch (e) {}

        const playerOpts = {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (e) => {
              try { e.target.setVolume(volume); } catch (e) {}
              // ensure reference to player
              try { playerRef.current = e.target; } catch (err) {}
              // load playlist or video in the ready callback to ensure player is fully ready
              try {
                if (playlistId && e.target.loadPlaylist) {
                  e.target.loadPlaylist({ list: playlistId, listType: 'playlist' });
                } else if (videoId && e.target.loadVideoById) {
                  e.target.loadVideoById(videoId);
                }
              } catch (err) {}
              onReady && onReady(playerRef.current || e.target);
            },
            onStateChange: (e) => onStateChange && onStateChange(e, playerRef.current || e.target),
            onError: (e) => {
              console.error('YouTube player error', e);
            }
          }
        };

        // If playlistId is known, provide it in playerVars to help initial load
        if (playlistId) {
          playerOpts.playerVars.listType = 'playlist';
          playerOpts.playerVars.list = playlistId;
        }

        // prefer passing id string to YT.Player; fallback to element if needed
        try {
          console.log('Initializing YT.Player with id', containerRef.current.id);
          playerRef.current = new YT.Player(containerRef.current.id, playerOpts);
          console.log('YT.Player constructor returned', playerRef.current);
        } catch (err) {
          console.warn('YT.Player init with id failed, falling back to element', err);
          try {
            playerRef.current = new YT.Player(containerRef.current, playerOpts);
            console.log('YT.Player created with element fallback', playerRef.current);
          } catch (err2) {
            console.error('YT.Player creation failed', err2);
            playerRef.current = null;
          }
        }
        console.log('YT player init complete for', containerRef.current.id, { playlistId, videoId });

        // If after a short delay the JS API player isn't available, create an iframe fallback
        setTimeout(() => {
          if (!playerRef.current) {
            try {
              console.warn('YT JS player not available, creating iframe fallback');
              const iframe = document.createElement('iframe');
              let src = '';
              if (playlistId) {
                // embed playlist
                src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(playlistId)}&autoplay=1&controls=0&rel=0&modestbranding=1`;
              } else if (videoId) {
                src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=0&rel=0&modestbranding=1`;
              }
              // ensure JS API is enabled on fallback iframe so we can postMessage commands
              const fallbackId = `yt-fallback-${Date.now()}-${Math.floor(Math.random()*10000)}`;
              iframe.src = src + (src.includes('?') ? '&' : '?') + `enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
              iframe.id = fallbackId;
              iframe.width = '1';
              iframe.height = '1';
              iframe.style.position = 'absolute';
              iframe.style.left = '-9999px';
              iframe.style.top = '-9999px';
              containerRef.current.appendChild(iframe);
              // expose a minimal control via ytRef (iframe + id) so we can postMessage commands
              ytRef.current = { iframe };
            } catch (e) { console.error('iframe fallback creation failed', e); }
          }
        }, 2500);
      }).catch((err) => { console.error('YT API failed to load', err); });

      return () => {
        mounted = false;
        try { if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy(); } catch (e) { console.warn('destroy err', e); }
        try { if (containerRef.current && containerRef.current.parentNode) containerRef.current.parentNode.removeChild(containerRef.current); } catch (e) { console.warn('remove container err', e); }
      };
    }, [source]);

    // update volume
    useEffect(() => {
      try {
        if (playerRef.current && playerRef.current.setVolume) playerRef.current.setVolume(volume);
      } catch (e) {}
    }, [volume]);

    return null;
  };

  const theme = THEME_PRESETS[config.selectedTheme] || THEME_PRESETS.modern;
  
  // Filter slides: if any slide has presentOnly, show only that one
  const displaySlides = React.useMemo(() => {
    if (!config.slides || config.slides.length === 0) return [];
    const soloSlide = config.slides.find(s => s.presentOnly);
    return soloSlide ? [soloSlide] : config.slides;
  }, [config.slides]);

  // Auto-play slide progression (respects frozen slides and presentOnly filter)
  useEffect(() => {
    if (!config.autoPlay || displaySlides.length === 0) return;
    
    // Check if current slide is frozen
    const currentSlideData = displaySlides[currentSlideIndex % displaySlides.length];
    if (currentSlideData?.frozen) {
      // Slide is frozen - don't advance, keep progress at 100%
      setProgress(100);
      return;
    }

    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + (100 / (config.slideInterval * 10));
      });
    }, 100);

    const slideTimer = setTimeout(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % displaySlides.length);
    }, config.slideInterval * 1000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(slideTimer);
    };
  }, [currentSlideIndex, config.autoPlay, config.slideInterval, displaySlides]);
  
  const currentSlide = displaySlides.length > 0 ? displaySlides[currentSlideIndex % displaySlides.length] : null;

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
        <p className="text-4xl text-gray-600 text-center">Loading...</p>
      </div>
    );
  }

  if (!currentSlide || displaySlides.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
        <p className="text-4xl text-gray-600 text-center">No slides configured</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-16 ${config.music && config.music.enabled ? 'pb-40 md:pb-48' : ''} overflow-hidden transition-all duration-1000`} 
      style={{ transform: `scale(${(config && config.uiScale) || 1})`, transformOrigin: 'center top' }}
    >
      {/* Fullscreen Prompt Overlay */}
      <AnimatePresence>
        {showFullscreenPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            onClick={enterFullscreen}
          >
            <motion.div 
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-4">Click to Enter Fullscreen</h2>
              <p className="text-xl text-white/70 mb-8">For the best TV display experience</p>
              <motion.button
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-semibold rounded-2xl shadow-xl hover:shadow-2xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  enterFullscreen();
                }}
              >
                Enter Fullscreen
              </motion.button>
              <p className="text-sm text-white/50 mt-6">Press ESC to exit fullscreen anytime</p>
              <button 
                className="mt-4 text-white/50 hover:text-white/80 underline text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullscreenPrompt(false);
                }}
              >
                Skip and continue in window mode
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background Elements */}
      {config.showParticles && <FloatingParticles colors={theme.colors} count={config.particleCount} />}
      <AnimatedShapes accentColor={theme.accentColor} />
      <GradientOrbs />
      <SparkleEffects />

      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <ModernSlideContent 
            key={currentSlide.id}
            slide={currentSlide}
            accentColor={theme.accentColor}
          />
        </AnimatePresence>
      </div>

      {/* Frozen Slide Indicator */}
      {currentSlide?.frozen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-8 left-8 px-4 py-2 bg-cyan-500/90 backdrop-blur-sm rounded-full text-white font-medium flex items-center gap-2 shadow-lg z-20"
        >
          <span className="text-xl">❄️</span>
          <span>Slide Frozen</span>
        </motion.div>
      )}

      {/* Progress Bar */}
      {config.autoPlay && (
        <motion.div 
          className="absolute bottom-0 left-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          style={{ 
            width: `${progress}%`,
            boxShadow: `0 0 20px ${theme.accentColor}`
          }}
          initial={{ width: 0 }}
        />
      )}

      {/* Slide Indicator Dots */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-5 z-50 bg-black/20 backdrop-blur-md px-8 py-4 rounded-full">
        {displaySlides.length > 0 && displaySlides.map((slide, index) => (
          <motion.div
            key={slide.id}
            className="relative"
          >
            {currentSlideIndex % displaySlides.length === index && (
              <motion.div
                layoutId="activeDot"
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${theme.accentColor}, ${theme.accentColor})`
                }}
                initial={false}
                animate={{
                  boxShadow: [
                    `0 0 20px ${theme.accentColor}`,
                    `0 0 30px ${theme.accentColor}`,
                    `0 0 20px ${theme.accentColor}`
                  ]
                }}
                transition={{ 
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  boxShadow: { duration: 2, repeat: Infinity }
                }}
              />
            )}
            <motion.div
              className={`h-6 rounded-full transition-all duration-300 ${
                currentSlideIndex % displaySlides.length === index ? "w-16" : "w-6 bg-white/50"
              }`}
              animate={currentSlideIndex % displaySlides.length === index ? { 
                scale: [1, 1.15, 1],
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        ))}
      </div>

      {/* Slide Counter */}
      <div 
        className="absolute top-8 right-8 text-4xl font-bold px-8 py-4 rounded-2xl bg-white/30 backdrop-blur-md shadow-xl flex items-center gap-4 z-[60]"
        style={{ color: theme.accentColor }}
      >
        {(currentSlideIndex % displaySlides.length) + 1} / {displaySlides.length}
        
        {/* Fullscreen Toggle */}
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              if (document.fullscreenElement || document.webkitFullscreenElement) {
                // Currently in fullscreen - exit
                if (document.exitFullscreen) {
                  await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                  await document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                  await document.msExitFullscreen();
                }
              } else {
                // Not in fullscreen - enter
                await enterFullscreen();
              }
            } catch (err) {
              console.warn('Fullscreen toggle failed:', err);
            }
          }}
          className="relative p-3 rounded-xl bg-white/20 hover:bg-white/40 active:bg-white/50 transition-colors cursor-pointer z-50"
          style={{ minWidth: '48px', minHeight: '48px' }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-8 h-8 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
            </svg>
          ) : (
            <svg className="w-8 h-8 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* Music Player Bar - YouTube */}
      {config.music && config.music.enabled && config.music.type === 'youtube' && (
        <>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] sm:w-[90%] sm:max-w-5xl bg-gradient-to-r from-black/60 to-black/40 backdrop-blur-lg rounded-2xl px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
              <img src={ytMeta.thumbnail || (extractVideoId(config.music.playlist) ? `https://img.youtube.com/vi/${extractVideoId(config.music.playlist)}/hqdefault.jpg` : '')} alt="thumb" className="w-full h-full object-cover" />
            </div>

            {/* Title / Author */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold truncate text-sm sm:text-base">{ytMeta.title || (extractVideoId(config.music.playlist) ? 'YouTube Track' : 'Playlist')}</div>
              <div className="text-xs sm:text-sm text-white/70 truncate">{ytMeta.author || (extractPlaylistId(config.music.playlist) ? 'YouTube Playlist' : '')}</div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setUserStartedMusic(true);
                  try {
                    const playlistId = extractPlaylistId(config.music.playlist);
                    const videoId = extractVideoId(config.music.playlist);

                    // If JS API player is ready, use it
                    if (ytRef.current && (ytRef.current.playVideo || ytRef.current.getPlayerState)) {
                      if (videoId && ytRef.current.loadVideoById) ytRef.current.loadVideoById(videoId);
                      else if (playlistId && ytRef.current.loadPlaylist) ytRef.current.loadPlaylist({ list: playlistId, listType: 'playlist' });
                      if (ytRef.current.playVideo) ytRef.current.playVideo();
                    } else {
                      // fallback: create a hidden iframe embed with autoplay
                      try {
                        const iframe = document.createElement('iframe');
                        let src = '';
                        if (playlistId) src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(playlistId)}&autoplay=1&controls=0&rel=0&modestbranding=1`;
                        else if (videoId) src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=0&rel=0&modestbranding=1`;
                        if (src) {
                          const fallbackId = `yt-fallback-${Date.now()}-${Math.floor(Math.random()*10000)}`;
                          iframe.src = src + (src.includes('?') ? '&' : '?') + `enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
                          iframe.id = fallbackId;
                          iframe.width = '1';
                          iframe.height = '1';
                          iframe.style.position = 'absolute';
                          iframe.style.left = '-9999px';
                          iframe.style.top = '-9999px';
                          iframe.setAttribute('allow', 'autoplay; encrypted-media');
                          document.body.appendChild(iframe);
                          // expose minimal iframe handle on ytRef for cleanup and postMessage
                          ytRef.current = { iframe };
                          setIsPlayingIframe(true);
                        }
                      } catch (err) { console.warn('iframe fallback failed', err); }
                    }
                  } catch (e) { console.warn('Play error', e); }
                  // fetch metadata optimistically
                  const vid = extractVideoId(config.music.playlist);
                  fetchYtMeta(vid || (extractPlaylistId(config.music.playlist) ? `https://www.youtube.com/playlist?list=${extractPlaylistId(config.music.playlist)}` : ''));
                }}
                className="px-3 py-1 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow text-sm"
              >
                ▶ Play
              </button>

              <button
                onClick={() => {
                  try {
                    if (ytRef.current && ytRef.current.pauseVideo) {
                      ytRef.current.pauseVideo();
                    } else if (ytRef.current && ytRef.current.iframe) {
                      // remove iframe fallback to stop playback
                      try {
                        const node = ytRef.current.iframe;
                        if (node && node.parentNode) node.parentNode.removeChild(node);
                      } catch (e) { console.warn('remove iframe err', e); }
                      ytRef.current = null;
                      setIsPlayingIframe(false);
                    }
                  } catch (e) { console.warn(e); }
                }}
                className="px-3 py-1 sm:px-4 sm:py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow text-sm"
              >
                ⏸ Pause
              </button>

              <div className="flex items-center gap-3">
                <div className="text-white text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.5a1 1 0 00-1.555-.832L4 6H2a1 1 0 00-1 1v6a1 1 0 001 1h2l3.445 2.332A1 1 0 008 16.5V4.5z"/><path d="M13.5 7a1 1 0 10-1.732-1A5 5 0 0115 11a1 1 0 101.732 1A7 7 0 0013.5 7z"/></svg>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.music ? config.music.volume : 50}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    // update config so future players know desired volume
                    setConfig((prev) => ({
                      ...prev,
                      music: {
                        ...(prev.music || {}),
                        volume: v,
                      },
                    }));

                    try {
                      // if JS API player exists, set volume immediately
                      if (ytRef.current && ytRef.current.setVolume) {
                        ytRef.current.setVolume(v);
                      } else if (ytRef.current && ytRef.current.iframe) {
                        try {
                          const node = ytRef.current.iframe;
                          if (node && node.contentWindow) {
                            node.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*');
                          }
                        } catch (pmErr) { console.warn('postMessage setVolume failed', pmErr); }
                      } else {
                        // no player yet; just persist the desired volume
                        console.warn('Volume change saved; no player available yet.');
                      }
                    } catch (err) { console.warn('setVolume err', err); }
                  }}
                  className="w-36 h-1"
                />
                <div className="text-white text-sm w-10 text-right">{config.music ? config.music.volume : 50}%</div>
              </div>

              <a
                className="px-3 py-2 bg-white/10 rounded text-white"
                href={config.music.playlist || '#'}
                target="_blank"
                rel="noreferrer"
              >
                Open in YouTube
              </a>
            </div>
          </div>
          {/* Ensure a single hidden JS API player is mounted and controlled via `ytRef` */}
          <YouTubePlayer
            key={playerKey}
            source={config.music.playlist}
            volume={config.music.volume}
            onReady={(player) => {
              ytRef.current = player;
              setYtReady(true);
              try { const d = player.getVideoData(); setYtTitle(d && d.title ? d.title : ''); } catch (e) {}
            }}
            onStateChange={(e, player) => {
              setYtPlaying(e && e.data === 1);
              try { const d = player && player.getVideoData ? player.getVideoData() : null; if (d && d.title) setYtTitle(d.title); } catch (e) {}
            }}
          />
        </>
      )}

      {/* Music Player Bar - Local Music */}
      {config.music && config.music.enabled && config.music.type === 'local' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] sm:w-[90%] sm:max-w-5xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 backdrop-blur-lg rounded-2xl px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          {/* Album Art / Music Icon */}
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Icon name="Music" size={28} className="text-white" />
          </div>

          {/* Title / Artist */}
          <div className="flex-1 min-w-0">
            {currentSong ? (
              <>
                <div className="text-white font-semibold truncate text-sm sm:text-base flex items-center gap-2">
                  {isLocalPlaying && (
                    <span className="flex gap-0.5 items-end h-4">
                      <span className="w-1 bg-purple-400 animate-pulse" style={{ height: '60%', animationDelay: '0s' }}></span>
                      <span className="w-1 bg-purple-400 animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }}></span>
                      <span className="w-1 bg-purple-400 animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }}></span>
                    </span>
                  )}
                  {currentSong.name}
                </div>
                <div className="text-xs sm:text-sm text-white/70 truncate">{currentSong.artist || 'Unknown Artist'}</div>
              </>
            ) : localSongs.length > 0 ? (
              <>
                <div className="text-white font-semibold truncate text-sm sm:text-base">Local Playlist</div>
                <div className="text-xs sm:text-sm text-white/70">{localSongs.length} songs • Click to play</div>
              </>
            ) : (
              <>
                <div className="text-white font-semibold truncate text-sm sm:text-base">No Songs</div>
                <div className="text-xs sm:text-sm text-white/70">Select a playlist in control panel</div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Previous */}
            <button
              onClick={() => {
                const prevIndex = (currentSongIndex - 1 + localSongs.length) % localSongs.length;
                setCurrentSongIndex(prevIndex);
              }}
              disabled={localSongs.length === 0}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-50"
              title="Previous Song"
            >
              <Icon name="SkipBack" size={18} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => {
                if (audioRef.current) {
                  if (isLocalPlaying) {
                    audioRef.current.pause();
                    setIsLocalPlaying(false);
                  } else {
                    audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
                  }
                }
              }}
              disabled={localSongs.length === 0}
              className="p-3 sm:p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors shadow-lg disabled:opacity-50"
              title={isLocalPlaying ? 'Pause' : 'Play'}
            >
              <Icon name={isLocalPlaying ? 'Pause' : 'Play'} size={20} />
            </button>

            {/* Next */}
            <button
              onClick={() => {
                const nextIndex = (currentSongIndex + 1) % localSongs.length;
                setCurrentSongIndex(nextIndex);
              }}
              disabled={localSongs.length === 0}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-50"
              title="Next Song"
            >
              <Icon name="SkipForward" size={18} />
            </button>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Icon name="Volume2" size={16} className="text-white/70" />
              <input
                type="range"
                min={0}
                max={100}
                value={config.music?.volume || 50}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setConfig((prev) => ({
                    ...prev,
                    music: {
                      ...(prev.music || {}),
                      volume: v,
                    },
                  }));
                }}
                className="w-24 h-1"
              />
              <div className="text-white text-sm w-10 text-right">{config.music?.volume || 50}%</div>
            </div>

            {/* Song counter */}
            {localSongs.length > 0 && (
              <div className="hidden sm:block text-white/70 text-sm px-3 py-1 bg-white/10 rounded-full">
                {currentSongIndex + 1} / {localSongs.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User gesture overlay removed — Play button is primary starter */}

      {/* Music debug panel removed for production */}
    </div>
  );
};

export default TVDisplayModern;
