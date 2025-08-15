import React, { useState } from 'react';
import { useNotifications } from './NotificationProvider';

export function VolumeControl() {
  const { soundEnabled, toggleSound, volume, setVolume } = useNotifications();
  const [showSlider, setShowSlider] = useState(false);
  
  // Convert volume (0.0-1.0) to percentage (0-100) for display
  const volumePercentage = Math.round(volume * 100);
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseInt(e.target.value);
    const volumeValue = percentage / 100;
    setVolume(volumeValue);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Mute/Unmute Button */}
      <button 
        onClick={toggleSound} 
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={soundEnabled ? 'Mute notifications' : 'Enable notification sounds'}
      >
        {soundEnabled ? (
          // Volume on icon
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8 19a1 1 0 01-1-1v-6a1 1 0 011-1h2.172a3 3 0 001.414-.586L15 7a1 1 0 011 1v8a1 1 0 01-1 1l-3.414-3.414A3 3 0 0010.172 13H8a1 1 0 01-1-1V7a1 1 0 011-1z" />
          </svg>
        ) : (
          // Volume off icon
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1V9a1 1 0 011-1h1.586l4.707-4.707C10.923 2.663 12 3.109 12 4v16c0 .891-1.077 1.337-1.707.707L5.586 16z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>

      {/* Volume Slider - only show when sound is enabled */}
      {soundEnabled && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={volumePercentage}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            title={`Volume: ${volumePercentage}%`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[2rem]">
            {volumePercentage}%
          </span>
        </div>
      )}
      
      {/* Custom CSS for the slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-webkit-slider-thumb:hover {
          background: #1d4ed8;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb:hover {
          background: #1d4ed8;
        }

        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 5px;
          background: linear-gradient(to right, #2563eb 0%, #2563eb ${volumePercentage}%, #d1d5db ${volumePercentage}%, #d1d5db 100%);
        }
        
        .dark .slider::-webkit-slider-track {
          background: linear-gradient(to right, #2563eb 0%, #2563eb ${volumePercentage}%, #4b5563 ${volumePercentage}%, #4b5563 100%);
        }
      `}</style>
    </div>
  );
}