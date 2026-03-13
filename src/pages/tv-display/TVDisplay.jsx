import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../components/AppIcon';

// Theme Presets with modern card colors
const THEME_PRESETS = {
  modern: { gradient: 'from-slate-900 via-purple-900 to-slate-900', accentColor: '#ddd6fe', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'fade' },
  vibrant: { gradient: 'from-orange-900 via-red-900 to-pink-900', accentColor: '#fed7aa', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'slide' },
  elegant: { gradient: 'from-amber-950 via-yellow-900 to-amber-950', accentColor: '#fcd34d', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'zoom' },
  ocean: { gradient: 'from-cyan-900 via-blue-900 to-teal-900', accentColor: '#a5f3fc', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'wave' },
  forest: { gradient: 'from-emerald-900 via-green-900 to-teal-900', accentColor: '#a7f3d0', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'float' },
  sunset: { gradient: 'from-rose-900 via-orange-900 to-yellow-900', accentColor: '#fbbf24', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'pulse' },
  deep: { gradient: 'from-indigo-950 via-purple-950 to-black', accentColor: '#c7d2fe', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'glow' },
  pastel: { gradient: 'from-pink-800 via-purple-800 to-blue-800', accentColor: '#e9d5ff', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'bounce' },
  neon: { gradient: 'from-gray-950 via-purple-900 to-gray-950', accentColor: '#00ff88', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'flicker' },
  retro: { gradient: 'from-red-900 via-yellow-800 to-blue-900', accentColor: '#fcd34d', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'swing' },
  cyberpunk: { gradient: 'from-fuchsia-950 via-cyan-900 to-fuchsia-950', accentColor: '#ff00ff', cardBg: '#1f1f2e', cardText: '#ffffff', animationStyle: 'glitch' },
  candy: { gradient: 'from-pink-700 via-rose-600 to-pink-700', accentColor: '#fce7f3', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'bounce-pop' },
  rainbow: { gradient: 'from-purple-900 via-pink-800 to-orange-800', accentColor: '#fbbf24', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'rainbow-shift' },
  tropical: { gradient: 'from-lime-800 via-emerald-700 to-cyan-800', accentColor: '#86efac', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'wave-loop' },
  cosmic: { gradient: 'from-purple-950 via-indigo-900 to-black', accentColor: '#c084fc', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'cosmic-spin' },
  fire: { gradient: 'from-red-950 via-orange-800 to-yellow-800', accentColor: '#fca5a5', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'fire-flicker' },
  snow: { gradient: 'from-blue-900 via-cyan-800 to-slate-800', accentColor: '#e0f2fe', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'snow-fall' },
  aurora: { gradient: 'from-green-900 via-cyan-900 to-purple-900', accentColor: '#a7f3d0', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'aurora-wave' },
  disco: { gradient: 'from-purple-800 via-pink-700 to-purple-800', accentColor: '#ec4899', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'disco-pulse' },
  gaming: { gradient: 'from-slate-950 via-lime-900 to-slate-950', accentColor: '#84cc16', cardBg: '#1f2937', cardText: '#84cc16', animationStyle: 'game-flash' },
  bloom: { gradient: 'from-rose-800 via-pink-700 to-orange-700', accentColor: '#fbcfe8', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'bloom-grow' },
  jungle: { gradient: 'from-green-950 via-amber-900 to-green-950', accentColor: '#86efac', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'jungle-sway' },
  candy2: { gradient: 'from-purple-700 via-pink-600 to-blue-700', accentColor: '#f0abfc', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'candy-float' },
  ocean2: { gradient: 'from-blue-950 via-teal-900 to-slate-950', accentColor: '#22d3ee', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'ocean-wave' },
  lava: { gradient: 'from-red-950 via-orange-900 to-amber-900', accentColor: '#fca5a5', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'lava-pulse' },
  crystal: { gradient: 'from-cyan-800 via-blue-800 to-purple-800', accentColor: '#cffafe', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'crystal-shine' },
  matrix: { gradient: 'from-black via-green-950 to-black', accentColor: '#22c55e', cardBg: '#0f172a', cardText: '#22c55e', animationStyle: 'matrix-rain' },
  candy3: { gradient: 'from-pink-800 via-purple-700 to-pink-800', accentColor: '#fbcfe8', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'bubble-pop' },
  cherry: { gradient: 'from-pink-700 via-rose-600 to-red-700', accentColor: '#fbcfe8', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'petal-fall' },
  candy4: { gradient: 'from-green-700 via-cyan-600 to-blue-700', accentColor: '#a7f3d0', cardBg: '#ffffff', cardText: '#1f2937', animationStyle: 'mint-swirl' },
};

const getAnimationCSS = () => `
  @keyframes slide-up { 0% { transform: translateY(40px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes slide-in-left { 0% { transform: translateX(-60px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes slide-in-right { 0% { transform: translateX(60px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes zoom-in { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
  @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes icon-bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 0px currentColor; } 50% { box-shadow: 0 0 20px currentColor; } }
  @keyframes shine { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
  @keyframes confetti-fall { 0% { transform: translateY(-100px) rotateZ(0deg) scale(1); opacity: 1; } 100% { transform: translateY(500px) rotateZ(720deg) scale(0); opacity: 0; } }
  @keyframes pulse-scale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  @keyframes slide { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes zoom { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes swing { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
  @keyframes glitch { 0% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
  @keyframes bounce-pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
  @keyframes rainbow-shift { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
  @keyframes wave-loop { 0%, 100% { transform: translateY(0px) rotateX(0deg); } 25% { transform: translateY(-15px) rotateX(10deg); } 50% { transform: translateY(-30px) rotateX(0deg); } 75% { transform: translateY(-15px) rotateX(-10deg); } }
  @keyframes cosmic-spin { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
  @keyframes fire-flicker { 0%, 100% { opacity: 1; text-shadow: 0 0 10px #ff6600; } 50% { opacity: 0.8; text-shadow: 0 0 20px #ff3300; } }
  @keyframes snow-fall { 0% { transform: translateY(-100px) rotateZ(0deg); opacity: 1; } 100% { transform: translateY(100px) rotateZ(360deg); opacity: 0; } }
  @keyframes aurora-wave { 0%, 100% { transform: skewX(0deg); filter: blur(0px); } 50% { transform: skewX(5deg); filter: blur(2px); } }
  @keyframes disco-pulse { 0%, 100% { transform: scale(1); filter: brightness(1); } 25% { transform: scale(1.05); filter: brightness(1.2); } 50% { transform: scale(1.1); filter: brightness(1.4); } 75% { transform: scale(1.05); filter: brightness(1.2); } }
  @keyframes game-flash { 0%, 100% { filter: brightness(1) drop-shadow(0 0 0px); } 50% { filter: brightness(1.5) drop-shadow(0 0 10px); } }
  @keyframes bloom-grow { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes jungle-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
  @keyframes candy-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
  @keyframes ocean-wave { 0%, 100% { transform: translateX(0px) rotateZ(0deg); } 50% { transform: translateX(10px) rotateZ(5deg); } }
  @keyframes lava-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
  @keyframes crystal-shine { 0%, 100% { filter: brightness(1) drop-shadow(0 0 0px); } 50% { filter: brightness(1.5) drop-shadow(0 0 20px); } }
  @keyframes matrix-rain { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
  @keyframes bubble-pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes petal-fall { 0% { transform: translateY(0) rotateZ(0deg); opacity: 1; } 100% { transform: translateY(50px) rotateZ(360deg); opacity: 0; } }
  @keyframes mint-swirl { 0%, 100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(15deg); } }
  .animate-slide-up { animation: slide-up 0.6s ease-out; }
  .animate-slide-in-left { animation: slide-in-left 0.6s ease-out; }
  .animate-slide-in-right { animation: slide-in-right 0.6s ease-out; }
  .animate-zoom-in { animation: zoom-in 0.6s ease-out; }
  .animate-bounce-in { animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-icon-bounce { animation: icon-bounce 0.6s ease-in-out; }
  .animate-slide { animation: slide 0.8s ease-out; }
  .animate-zoom { animation: zoom 0.8s ease-out; }
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
  .animate-jungle-sway { animation: jungle-sway 1.5s ease-in-out infinite; }
  .animate-candy-float { animation: candy-float 2.5s ease-in-out infinite; }
  .animate-ocean-wave { animation: ocean-wave 2s ease-in-out infinite; }
  .animate-lava-pulse { animation: lava-pulse 1.2s ease-in-out infinite; }
  .animate-crystal-shine { animation: crystal-shine 2s ease-in-out infinite; }
  .animate-matrix-rain { animation: matrix-rain 1.5s ease-in-out infinite; }
  .animate-bubble-pop { animation: bubble-pop 0.8s ease-out; }
  .animate-petal-fall { animation: petal-fall 2s ease-in; }
  .animate-mint-swirl { animation: mint-swirl 2s ease-in-out infinite; }
  .animate-confetti { animation: confetti-fall 2.5s ease-in forwards; }
  .animate-pulse-scale { animation: pulse-scale 1.5s ease-in-out infinite; }
`;

const ParticleBackground = ({ theme }) => {
  const particleEmojis = ['🎀', '✨', '🌟', '💫', '⭐', '🎈', '🎊', '🎉', '💖', '🎁'];
  const particles = Array.from({ length: 20 }).map((_, i) => (
    <div
      key={i}
      className="absolute text-2xl animate-confetti"
      style={{
        left: `${Math.random() * 100}%`,
        top: '-50px',
        animation: `confetti-fall ${2.5 + Math.random() * 1}s ease-in forwards`,
        animationDelay: `${Math.random() * 2}s`,
        opacity: 0.8,
      }}
    >
      {particleEmojis[Math.floor(Math.random() * particleEmojis.length)]}
    </div>
  ));

  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>;
};

const ModernSlideContent = ({ slide, theme, currentTime }) => {
  // Helper functions for countdown
  const getItemCountdown = (item) => {
    // Parse time from item like "10:00 AM - Morning Walk"
    const timeMatch = item.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (!timeMatch) return null;
    
    const timeStr = timeMatch[1];
    const today = new Date();
    let hours, minutes;
    
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      const [time, period] = timeStr.split(/\s+/);
      const [h, m] = time.split(':').map(Number);
      hours = period.toLowerCase() === 'pm' && h !== 12 ? h + 12 : (period.toLowerCase() === 'am' && h === 12 ? 0 : h);
      minutes = m;
    } else {
      [hours, minutes] = timeStr.split(':').map(Number);
    }
    
    const activityTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    const now = currentTime || new Date();
    const diff = activityTime - now;
    
    if (diff < -3600000) return { status: 'done', text: 'Done' };
    if (diff < 0 && diff >= -3600000) return { status: 'now', text: 'NOW' };
    
    const hoursLeft = Math.floor(diff / 3600000);
    const minsLeft = Math.floor((diff % 3600000) / 60000);
    const secsLeft = Math.floor((diff % 60000) / 1000);
    
    if (hoursLeft > 0) {
      return { status: 'upcoming', text: `${hoursLeft}h ${minsLeft}m` };
    } else if (minsLeft > 0) {
      return { status: minsLeft <= 10 ? 'imminent' : 'upcoming', text: `${minsLeft}m ${secsLeft}s` };
    } else {
      return { status: 'imminent', text: `${secsLeft}s` };
    }
  };

  const getActivityName = (item) => {
    // Remove time prefix from item
    return item.replace(/^\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s*/i, '').trim();
  };

  const getTimeDisplay = (item) => {
    const timeMatch = item.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    return timeMatch ? timeMatch[1] : '';
  };

  // Title/Big Icon style - modern card based
  if (slide.displayStyle === 'big-icon' || slide.displayStyle === 'title') {
    return (
      <div className="w-11/12 max-w-4xl space-y-8 animate-slide-up">
        {/* Header badge if available */}
        {slide.subtitle && (
          <div
            className="inline-block px-8 py-3 rounded-full font-bold text-lg mx-auto w-fit animate-slide-in-left"
            style={{
              background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}cc)`,
              color: theme.cardText,
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            {slide.subtitle}
          </div>
        )}

        {/* Main card */}
        <div
          className="rounded-3xl p-12 shadow-2xl backdrop-blur-sm animate-zoom-in"
          style={{
            background: theme.cardBg,
            color: theme.cardText,
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px ${theme.accentColor}30`,
            border: `2px solid ${theme.accentColor}20`,
          }}
        >
          <div className="flex flex-col items-center gap-8">
            {/* Icon with glow */}
            <div className="relative">
              <div
                className="absolute inset-0 blur-2xl rounded-full opacity-50"
                style={{ background: theme.accentColor, width: '140px', height: '140px', margin: 'auto' }}
              ></div>
              <div
                className="relative text-7xl animate-icon-bounce"
                style={{ filter: `drop-shadow(0 0 15px ${theme.accentColor})` }}
              >
                {slide.icon}
              </div>
            </div>

            {/* Content */}
            <h1 className="text-5xl font-900 text-center leading-tight tracking-tight">
              {slide.content}
            </h1>
          </div>
        </div>
      </div>
    );
  }

  // List style - card per item with live countdown
  if (slide.displayStyle === 'list') {
    const items = slide.subtitle?.split('\n').filter(item => item.trim()) || [];
    const isActivitiesSlide = slide.content?.toLowerCase().includes('activit') || slide.id === 'activities';
    
    return (
      <div className="w-11/12 max-w-4xl space-y-6 animate-slide-up">
        {/* Header */}
        <div
          className="rounded-3xl p-8 text-center animate-slide-in-left shadow-lg"
          style={{
            background: theme.cardBg,
            color: theme.cardText,
            border: `2px solid ${theme.accentColor}`,
          }}
        >
          <h1 className="text-5xl font-900 flex items-center justify-center gap-4">
            <span className="text-6xl">{slide.icon}</span>
            {slide.content}
          </h1>
        </div>

        {/* List items */}
        <div className="space-y-4">
          {items.map((item, idx) => {
            const countdown = isActivitiesSlide ? getItemCountdown(item) : null;
            const timeDisplay = isActivitiesSlide ? getTimeDisplay(item) : '';
            const activityName = isActivitiesSlide ? getActivityName(item) : item;
            
            // Determine colors based on countdown status
            const getStatusColors = () => {
              if (!countdown) return { bg: theme.accentColor, border: theme.accentColor };
              switch (countdown.status) {
                case 'now': return { bg: '#10B981', border: '#10B981' };
                case 'imminent': return { bg: '#F59E0B', border: '#F59E0B' };
                case 'done': return { bg: '#6B7280', border: '#6B7280' };
                default: return { bg: theme.accentColor, border: theme.accentColor };
              }
            };
            
            const statusColors = getStatusColors();
            
            return (
              <div
                key={idx}
                className={`rounded-2xl p-6 flex items-center gap-6 shadow-lg animate-bounce-in ${countdown?.status === 'imminent' ? 'animate-pulse' : ''}`}
                style={{
                  background: theme.cardBg,
                  color: theme.cardText,
                  border: `3px solid ${statusColors.border}`,
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                {/* Time badge for activities */}
                {timeDisplay ? (
                  <div
                    className="flex-shrink-0 px-4 py-2 rounded-xl flex items-center justify-center text-white font-bold text-lg min-w-[100px]"
                    style={{ background: `linear-gradient(135deg, ${statusColors.bg}, ${statusColors.bg}cc)` }}
                  >
                    {timeDisplay}
                  </div>
                ) : (
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}cc)` }}
                  >
                    {idx + 1}
                  </div>
                )}
                
                {/* Activity name */}
                <p className="text-2xl font-semibold flex-1">{activityName}</p>
                
                {/* Countdown badge */}
                {countdown && (
                  <div
                    className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-xl text-white ${countdown.status === 'now' ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: countdown.status === 'now' 
                        ? 'linear-gradient(135deg, #10B981, #059669)' 
                        : countdown.status === 'imminent'
                          ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                          : countdown.status === 'done'
                            ? 'linear-gradient(135deg, #6B7280, #4B5563)'
                            : `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}cc)`,
                      boxShadow: countdown.status === 'now' ? '0 0 20px rgba(16, 185, 129, 0.5)' : 
                                 countdown.status === 'imminent' ? '0 0 15px rgba(245, 158, 11, 0.4)' : 'none'
                    }}
                  >
                    {countdown.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full width style - centered hero
  if (slide.displayStyle === 'full-width') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-12 gap-12 animate-slide-up">
        {/* Icon */}
        <div
          className="text-9xl animate-icon-bounce"
          style={{ filter: `drop-shadow(0 0 25px ${theme.accentColor})` }}
        >
          {slide.icon}
        </div>

        {/* Main card background */}
        <div
          className="rounded-3xl p-12 text-center shadow-2xl max-w-3xl backdrop-blur-sm animate-zoom-in"
          style={{
            background: theme.cardBg,
            color: theme.cardText,
            boxShadow: `0 20px 80px rgba(0, 0, 0, 0.3), 0 0 60px ${theme.accentColor}25`,
            border: `2px solid ${theme.accentColor}20`,
          }}
        >
          <h1 className="text-7xl font-900 mb-6 leading-tight">{slide.content}</h1>
          {slide.subtitle && <p className="text-3xl font-light opacity-90">{slide.subtitle}</p>}
        </div>
      </div>
    );
  }

  // Default centered
  return (
    <div className="w-11/12 max-w-3xl space-y-8 animate-slide-up">
      <div
        className="rounded-3xl p-12 text-center shadow-2xl backdrop-blur-sm animate-zoom-in"
        style={{
          background: theme.cardBg,
          color: theme.cardText,
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px ${theme.accentColor}30`,
          border: `2px solid ${theme.accentColor}20`,
        }}
      >
        <div className="flex flex-col items-center gap-8">
          {/* Icon with glow */}
          <div className="relative">
            <div
              className="absolute inset-0 blur-2xl rounded-full opacity-50"
              style={{ background: theme.accentColor, width: '140px', height: '140px', margin: 'auto' }}
            ></div>
            <div
              className="relative text-7xl animate-float"
              style={{ filter: `drop-shadow(0 0 15px ${theme.accentColor})` }}
            >
              {slide.icon}
            </div>
          </div>

          {/* Content */}
          <div>
            <h1 className="text-5xl font-900 text-center leading-tight">{slide.content}</h1>
            {slide.subtitle && <p className="text-2xl opacity-80 font-light mt-4">{slide.subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const TVDisplay = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [theme, setTheme] = useState(THEME_PRESETS.modern);
  const [autoPlay, setAutoPlay] = useState(true);
  const [slideInterval, setSlideInterval] = useState(15);
  const [slideProgress, setSlideProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Music state
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicSource, setMusicSource] = useState('youtube');
  const [localSongs, setLocalSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [musicVolume, setMusicVolume] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const audioRef = useRef(null);

  // Update current time every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const config = localStorage.getItem('tvDisplayConfig');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        console.log('TV Display loaded config:', parsed);
        console.log('Music settings:', parsed.music);
        setSlides(parsed.slides || []);
        setTheme(THEME_PRESETS[parsed.selectedTheme] || THEME_PRESETS.modern);
        setAutoPlay(parsed.autoPlay !== false);
        setSlideInterval(parsed.slideInterval || 15);
        
        // Load music settings
        if (parsed.music) {
          console.log('Setting music source to:', parsed.music.type);
          console.log('Local songs:', parsed.music.localSongs?.length || 0);
          setMusicEnabled(parsed.music.enabled || false);
          setMusicSource(parsed.music.type || 'youtube');
          setMusicVolume(parsed.music.volume || 50);
          if (parsed.music.localSongs && parsed.music.localSongs.length > 0) {
            setLocalSongs(parsed.music.localSongs);
          }
        }
      } catch (e) {
        console.error('Failed to load TV display config:', e);
      }
    }
    setLoaded(true);
  }, []);

  // Play local music
  useEffect(() => {
    if (!musicEnabled || musicSource !== 'local' || localSongs.length === 0) {
      // Stop any playing audio if conditions not met
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setCurrentSong(null);
        setIsPlaying(false);
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
      audioRef.current.volume = musicVolume / 100;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setCurrentSong(song);
        setCurrentSongIndex(index);
      }).catch(e => {
        console.warn('Autoplay blocked, user interaction required:', e);
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
  }, [musicEnabled, musicSource, localSongs, currentSongIndex, musicVolume]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume]);

  // Listen for config updates from control panel
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tvDisplayConfig') {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.music) {
            setMusicEnabled(parsed.music.enabled || false);
            setMusicSource(parsed.music.type || 'youtube');
            setMusicVolume(parsed.music.volume || 50);
            if (parsed.music.localSongs) {
              setLocalSongs(parsed.music.localSongs);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!autoPlay || !slides.length) return;
    const interval = setInterval(() => {
      setSlideProgress((prev) => (prev >= 100 ? 0 : prev + (100 / (slideInterval * 10))));
    }, 100);
    return () => clearInterval(interval);
  }, [autoPlay, slideInterval, slides.length]);

  useEffect(() => {
    if (!autoPlay || !slides.length) return;
    const interval = setInterval(() => {
      setSlideProgress(0);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, slideInterval * 1000);
    return () => clearInterval(interval);
  }, [autoPlay, slideInterval, slides.length]);

  if (!loaded || !slides.length) {
    return (
      <div className={`h-screen w-screen bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center text-white overflow-hidden`}>
        <style>{getAnimationCSS()}</style>
        <div className="text-center space-y-6 animate-slide-up">
          <div className="text-9xl animate-bounce">📺</div>
          <h1 className="text-6xl font-900">No Slides Configured</h1>
          <p className="text-2xl opacity-70 font-light">Please add slides from the control panel</p>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="relative overflow-hidden bg-black">
      <style>{getAnimationCSS()}</style>
      
      <div className={`h-screen w-screen bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center text-white overflow-hidden relative`}>
        {/* Particle background */}
        <ParticleBackground theme={theme} />
        
        {/* Premium glassmorphic overlay */}
        <div className="absolute inset-0 backdrop-blur-3xl opacity-10"></div>

        {/* Main content */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <ModernSlideContent slide={currentSlideData} theme={theme} currentTime={currentTime} />
        </div>

        {/* Modern navigation dots */}
        <div className="absolute bottom-24 flex gap-3 z-20 backdrop-blur-md bg-black/20 px-6 py-3 rounded-full">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className="rounded-full transition-all duration-300 hover:scale-125"
              style={{
                width: idx === currentSlide ? '14px' : '8px',
                height: '8px',
                backgroundColor: idx === currentSlide ? theme.accentColor : `${theme.accentColor}60`,
                boxShadow: idx === currentSlide ? `0 0 15px ${theme.accentColor}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Slide counter - modern badge */}
        <div
          className="absolute top-8 right-8 z-20 backdrop-blur-md bg-black/30 px-6 py-3 rounded-full font-bold text-xl border border-white/20"
          style={{ color: theme.accentColor }}
        >
          {currentSlide + 1} / {slides.length}
        </div>

        {/* Music Player Indicator - Local Music */}
        {musicEnabled && musicSource === 'local' && (
          <div 
            className="absolute top-8 left-8 z-20 backdrop-blur-md bg-black/30 px-5 py-3 rounded-full border border-white/20 flex items-center gap-3 animate-slide-in-left"
          >
            {currentSong ? (
              <>
                <div className="flex gap-1 items-end h-5">
                  <div className="w-1 bg-current animate-pulse" style={{ height: '60%', animationDelay: '0s', color: theme.accentColor }}></div>
                  <div className="w-1 bg-current animate-pulse" style={{ height: '100%', animationDelay: '0.1s', color: theme.accentColor }}></div>
                  <div className="w-1 bg-current animate-pulse" style={{ height: '40%', animationDelay: '0.2s', color: theme.accentColor }}></div>
                  <div className="w-1 bg-current animate-pulse" style={{ height: '80%', animationDelay: '0.3s', color: theme.accentColor }}></div>
                </div>
                <div className="text-white">
                  <p className="font-medium text-sm truncate max-w-48">{currentSong.name}</p>
                  <p className="text-xs opacity-70">{currentSong.artist || 'Unknown Artist'}</p>
                </div>
              </>
            ) : localSongs.length > 0 ? (
              <>
                <Icon name="Music" size={20} style={{ color: theme.accentColor }} />
                <div className="text-white">
                  <p className="font-medium text-sm">Local Playlist</p>
                  <p className="text-xs opacity-70">{localSongs.length} songs ready</p>
                </div>
              </>
            ) : (
              <>
                <Icon name="Music" size={20} style={{ color: theme.accentColor }} />
                <div className="text-white">
                  <p className="font-medium text-sm">No songs loaded</p>
                  <p className="text-xs opacity-70">Add songs in control panel</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Music Player Indicator - YouTube */}
        {musicEnabled && musicSource === 'youtube' && (
          <div 
            className="absolute top-8 left-8 z-20 backdrop-blur-md bg-black/30 px-5 py-3 rounded-full border border-white/20 flex items-center gap-3 animate-slide-in-left"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill={theme.accentColor}>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <div className="text-white">
              <p className="font-medium text-sm">YouTube Music</p>
              <p className="text-xs opacity-70">Playing in background</p>
            </div>
          </div>
        )}
      </div>

      {/* Modern progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50 backdrop-blur-sm">
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${slideProgress}%`,
            background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.accentColor}80)`,
            boxShadow: `0 0 20px ${theme.accentColor}`,
          }}
        ></div>
      </div>

      {/* Modern control bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Left nav */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            className="p-4 backdrop-blur-md rounded-full transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/50 hover:bg-white/10"
            style={{ color: theme.accentColor }}
          >
            <Icon name="ChevronLeft" size={28} />
          </button>

          {/* Center indicators */}
          <div className="flex gap-3 items-center justify-center flex-1 backdrop-blur-md bg-black/20 px-6 py-3 rounded-full">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className="transition-all duration-300 rounded-full border-2 hover:scale-110"
                style={{
                  width: idx === currentSlide ? '10px' : '6px',
                  height: '6px',
                  background: idx === currentSlide ? theme.accentColor : 'transparent',
                  borderColor: theme.accentColor,
                  boxShadow: idx === currentSlide ? `0 0 12px ${theme.accentColor}` : 'none',
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Music Controls - only show when local music is enabled */}
            {musicEnabled && musicSource === 'local' && localSongs.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const prevIndex = (currentSongIndex - 1 + localSongs.length) % localSongs.length;
                    setCurrentSongIndex(prevIndex);
                  }}
                  className="p-3 backdrop-blur-md rounded-full transition-all duration-300 border hover:scale-110"
                  style={{
                    borderColor: theme.accentColor,
                    color: theme.accentColor,
                  }}
                  title="Previous Song"
                >
                  <Icon name="SkipBack" size={18} />
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        audioRef.current.play();
                        setIsPlaying(true);
                      }
                    }
                  }}
                  className="p-3 backdrop-blur-md rounded-full transition-all duration-300 border hover:scale-110"
                  style={{
                    background: isPlaying ? `${theme.accentColor}30` : 'transparent',
                    borderColor: theme.accentColor,
                    color: theme.accentColor,
                  }}
                  title={isPlaying ? 'Pause Music' : 'Play Music'}
                >
                  <Icon name={isPlaying ? 'Pause' : 'Play'} size={18} />
                </button>
                <button
                  onClick={() => {
                    const nextIndex = (currentSongIndex + 1) % localSongs.length;
                    setCurrentSongIndex(nextIndex);
                  }}
                  className="p-3 backdrop-blur-md rounded-full transition-all duration-300 border hover:scale-110"
                  style={{
                    borderColor: theme.accentColor,
                    color: theme.accentColor,
                  }}
                  title="Next Song"
                >
                  <Icon name="SkipForward" size={18} />
                </button>
                <div className="w-px h-8 bg-white/20 mx-2"></div>
              </>
            )}

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="p-4 backdrop-blur-md rounded-full transition-all duration-300 border hover:scale-110"
              style={{
                background: autoPlay ? `${theme.accentColor}20` : 'transparent',
                borderColor: theme.accentColor,
                color: theme.accentColor,
              }}
            >
              <Icon name={autoPlay ? 'Pause' : 'Play'} size={24} />
            </button>

            <button
              onClick={exitFullscreen}
              className="p-4 backdrop-blur-md rounded-full transition-all duration-300 hover:scale-110 border border-white/20 hover:border-red-400/50 hover:bg-red-500/10"
              style={{ color: theme.accentColor }}
            >
              <Icon name="X" size={24} />
            </button>
          </div>

          {/* Right nav */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="p-4 backdrop-blur-md rounded-full transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/50 hover:bg-white/10"
            style={{ color: theme.accentColor }}
          >
            <Icon name="ChevronRight" size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TVDisplay;
