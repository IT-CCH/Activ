import React, { useState } from 'react';
import Icon from './AppIcon';

const HolidayFactsModal = ({ isOpen, holidays, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen || !holidays || holidays.length === 0) return null;

  const holiday = holidays[activeTab];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden transform transition-all`}>
        {/* Header with gradient matching holiday */}
        <div className={`bg-gradient-to-r ${holiday.greetingBg} text-white p-8`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl animate-holiday-float">{holiday.emoji}</span>
              <div>
                <h2 className="text-3xl font-bold">{holiday.name}</h2>
                <p className="text-sm opacity-90 mt-1">Learn about this special day</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Icon name="X" size={24} />
            </button>
          </div>

          {/* Tabs for multiple holidays */}
          {holidays.length > 1 && (
            <div className="flex gap-2 mt-4">
              {holidays.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === idx
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <span className="text-lg">{h.emoji}</span>
                  <span className="text-sm">{h.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Main Fact */}
          <div className="mb-8 pb-8 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Did You Know?
            </h3>
            <p className="text-slate-700 leading-relaxed text-base">
              {holiday.fact}
            </p>
          </div>

          {/* Historical Note */}
          {holiday.historicalNote && (
            <div className="mb-8 pb-8 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">📚</span>
                Historical Background
              </h3>
              <p className="text-slate-700 leading-relaxed text-base">
                {holiday.historicalNote}
              </p>
            </div>
          )}

          {/* Activities Suggestions */}
          {holiday.activities && holiday.activities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Suggested Activities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {holiday.activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${holiday.color} border-l-4 border-current`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">✓</span>
                      <span className="font-medium">{activity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className={`px-6 py-2 text-white rounded-lg font-medium transition-colors ${holiday.greetingBg}`}
          >
            Got it! 🎉
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayFactsModal;
