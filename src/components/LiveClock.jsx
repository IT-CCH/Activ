import React, { useState, useEffect, useRef } from 'react';

const LiveClock = ({ testDate }) => {
  const [time, setTime] = useState(testDate || new Date());
  const animationRef = useRef();

  useEffect(() => {
    if (testDate) {
      // When testDate is provided, use it directly and don't update
      setTime(testDate);
    } else {
      // Normal live clock behavior with smooth animation
      const updateClock = () => {
        setTime(new Date());
        animationRef.current = requestAnimationFrame(updateClock);
      };

      animationRef.current = requestAnimationFrame(updateClock);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [testDate]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getTimeOfDay = (hour) => {
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    if (hour < 21) return '🌆 Good Evening';
    return '🌙 Good Night';
  };

  const hour = time.getHours();
  const minute = time.getMinutes();
  const second = time.getSeconds();
  const millisecond = time.getMilliseconds();

  const timeOfDay = getTimeOfDay(hour);

  // Calculate hand rotations
  const secondRotation = (second * 6) + (millisecond * 0.006); // 6 degrees per second + smooth millisecond movement
  const minuteRotation = (minute * 6) + (second * 0.1); // 6 degrees per minute + second influence
  const hourRotation = ((hour % 12) * 30) + (minute * 0.5) + (second * (0.5 / 60)); // 30 degrees per hour + minute/second influence

  return (
    <div className="flex items-center gap-4">
      <div>
        <p className="text-sm opacity-90">{timeOfDay}</p>
        <p className="text-3xl font-bold font-mono tracking-wider">
          {formatTime(time)}
        </p>
      </div>
      <div className="hidden sm:flex items-center justify-center w-20 h-20 rounded-full relative">
        {/* Clock face - properly sized */}
        <div className="w-20 h-20 rounded-full border border-gray-300 relative bg-white shadow-sm">
          {/* Second hand - thin and elegant */}
          <div
            className="absolute w-px h-8 bg-red-500 origin-bottom"
            style={{
              transform: `rotate(${secondRotation}deg)`,
              bottom: '50%',
              left: '50%',
              transformOrigin: '50% 32px',
              marginLeft: '-0.5px',
            }}
          />

          {/* Minute hand - clean and simple */}
          <div
            className="absolute w-0.5 h-7 bg-gray-800 origin-bottom"
            style={{
              transform: `rotate(${minuteRotation}deg)`,
              bottom: '50%',
              left: '50%',
              transformOrigin: '50% 28px',
              marginLeft: '-1px',
            }}
          />

          {/* Hour hand - slightly thicker */}
          <div
            className="absolute w-1 h-5 bg-gray-800 origin-bottom"
            style={{
              transform: `rotate(${hourRotation}deg)`,
              bottom: '50%',
              left: '50%',
              transformOrigin: '50% 20px',
              marginLeft: '-2px',
            }}
          />

          {/* Clean center dot */}
          <div className="absolute w-1.5 h-1.5 bg-gray-800 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
};

export default LiveClock;
