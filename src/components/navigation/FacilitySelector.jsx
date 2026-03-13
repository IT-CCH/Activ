import React, { useState, useEffect, useRef } from 'react';
import Icon from '../AppIcon';

const FacilitySelector = ({ onFacilityChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const selectorRef = useRef(null);

  const facilities = [
    { id: 1, name: 'Sunrise Care Home', location: 'Manchester', residents: 45 },
    { id: 2, name: 'Oakwood Manor', location: 'Birmingham', residents: 38 },
    { id: 3, name: 'Meadowbrook House', location: 'Leeds', residents: 52 },
    { id: 4, name: 'Riverside Gardens', location: 'Liverpool', residents: 41 },
  ];

  useEffect(() => {
    const savedFacility = localStorage.getItem('selectedFacility');
    if (savedFacility) {
      const facility = JSON.parse(savedFacility);
      setSelectedFacility(facility);
      if (onFacilityChange) {
        onFacilityChange(facility);
      }
    } else {
      setSelectedFacility(facilities?.[0]);
      if (onFacilityChange) {
        onFacilityChange(facilities?.[0]);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef?.current && !selectorRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    localStorage.setItem('selectedFacility', JSON.stringify(facility));
    setIsOpen(false);
    if (onFacilityChange) {
      onFacilityChange(facility);
    }
  };

  return (
    <div className="facility-selector" ref={selectorRef}>
      <button
        className="facility-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon name="Building2" size={16} />
        <span className="hidden lg:inline">{selectedFacility?.name || 'Select Facility'}</span>
        <span className="lg:hidden">{selectedFacility?.name?.split(' ')?.[0] || 'Facility'}</span>
        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} />
      </button>
      {isOpen && (
        <div className="facility-selector-dropdown">
          {facilities?.map((facility) => (
            <div
              key={facility?.id}
              className={`facility-selector-item ${selectedFacility?.id === facility?.id ? 'active' : ''}`}
              onClick={() => handleFacilitySelect(facility)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-foreground">{facility?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{facility?.location}</div>
                </div>
                <div className="text-xs text-muted-foreground">{facility?.residents} residents</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacilitySelector;