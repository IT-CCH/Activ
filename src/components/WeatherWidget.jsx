import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Icon from './AppIcon';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // OpenWeatherMap API key (you'll need to get this from openweathermap.org)
  const API_KEY = 'a6609643ab7526937d0a55721e35f1c3';
  
  // Load saved location and weather from localStorage
  useEffect(() => {
    const savedLocation = localStorage.getItem('weather-location');
    const savedWeather = localStorage.getItem('weather-data');
    const savedTimestamp = localStorage.getItem('weather-timestamp');
    
    if (savedLocation) {
      setLocation(savedLocation);
      
      // Check if saved weather data is still fresh (less than 10 minutes old)
      if (savedWeather && savedTimestamp) {
        const dataAge = Date.now() - parseInt(savedTimestamp);
        if (dataAge < 10 * 60 * 1000) { // 10 minutes
          setWeather(JSON.parse(savedWeather));
        } else {
          // Data is old, fetch fresh data
          fetchWeather(savedLocation);
        }
      } else {
        fetchWeather(savedLocation);
      }
    } else {
      // Default to London if no location saved
      setLocation('London');
      fetchWeather('London');
    }
  }, []);

  const fetchWeather = async (locationName) => {
    if (!API_KEY) {
      setError('Weather API key not configured');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // First, get coordinates from location name
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationName)}&limit=5&appid=${API_KEY}`
      );
      
      if (!geoResponse.ok) {
        if (geoResponse.status === 401) {
          throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        }
        throw new Error(`API Error: ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json();
      console.log('Geocoding response:', geoData); // Debug log
      
      if (!geoData.length) {
        throw new Error(`No results found for "${locationName}"`);
      }

      const { lat, lon, name, country } = geoData[0];
      
      // Get current weather
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      
      if (!weatherResponse.ok) {
        if (weatherResponse.status === 401) {
          throw new Error('Invalid API key. Please verify your OpenWeatherMap API key is correct and activated.');
        }
        throw new Error(`Weather API Error: ${weatherResponse.status}`);
      }
      
      const weatherData = await weatherResponse.json();
      console.log('Weather response:', weatherData); // Debug log

      const formattedWeather = {
        location: `${name}${country ? `, ${country}` : ''}`,
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        feelsLike: Math.round(weatherData.main.feels_like),
        humidity: weatherData.main.humidity,
        windSpeed: Math.round((weatherData.wind?.speed || 0) * 3.6), // Convert m/s to km/h
      };

      setWeather(formattedWeather);
      setLocation(formattedWeather.location);
      
      // Save to localStorage
      localStorage.setItem('weather-location', formattedWeather.location);
      localStorage.setItem('weather-data', JSON.stringify(formattedWeather));
      localStorage.setItem('weather-timestamp', Date.now().toString());
      
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchWeather(searchTerm.trim());
      setSearchTerm('');
      setShowSearch(false);
    }
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': 'Sun', '01n': 'Moon',
      '02d': 'CloudSun', '02n': 'CloudMoon',
      '03d': 'Cloud', '03n': 'Cloud',
      '04d': 'Cloud', '04n': 'Cloud',
      '09d': 'CloudRain', '09n': 'CloudRain',
      '10d': 'CloudRain', '10n': 'CloudRain',
      '11d': 'Zap', '11n': 'Zap',
      '13d': 'CloudSnow', '13n': 'CloudSnow',
      '50d': 'Cloud', '50n': 'Cloud',
    };
    return iconMap[iconCode] || 'Cloud';
  };

  if (error && !API_KEY) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-700 text-sm">
          <Icon name="AlertTriangle" size={16} />
          <span>Weather API key needed</span>
        </div>
        <p className="text-xs text-amber-600 mt-1">
          Get a free API key from OpenWeatherMap to enable weather features
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-white/40"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      {/* Header with location and search */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="MapPin" size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-700 truncate">
            {location || 'Loading...'}
          </span>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          disabled={isSearching}
        >
          <Icon name="Search" size={12} className="text-gray-500" />
        </button>
      </div>

      {/* Search form */}
      {showSearch && (
        <motion.form
          onSubmit={handleSearch}
          className="mb-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter city name..."
              className="flex-1 px-2 py-1 text-xs text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!searchTerm.trim() || isSearching}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </motion.form>
      )}

      {/* Weather display */}
      {isSearching ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-xs text-gray-600">Loading...</span>
        </div>
      ) : error ? (
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 text-red-600 text-xs">
            <Icon name="AlertCircle" size={12} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchWeather(location)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            Retry
          </button>
        </div>
      ) : weather ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full">
              <Icon 
                name={getWeatherIcon(weather.icon)} 
                size={16} 
                className="text-white" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800">
                  {weather.temperature}°C
                </span>
                <span className="text-xs text-gray-600 capitalize">
                  {weather.description}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>Feels {weather.feelsLike}°</span>
                <span>💨 {weather.windSpeed} km/h</span>
                <span>💧 {weather.humidity}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchWeather(location)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh weather"
          >
            <Icon name="RotateCcw" size={12} className="text-gray-400" />
          </button>
        </div>
      ) : null}
    </motion.div>
  );
};

export default WeatherWidget;