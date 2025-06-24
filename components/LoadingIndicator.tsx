import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 text-white font-['Inter']">
      <div className="relative mb-6">
        {/* Angular diamond spinner with yellow theme */}
        <div className="w-16 h-16 relative">
          <div 
            className="absolute inset-0 border-4 border-yellow-400 transform rotate-45 animate-pulse"
            style={{ borderRadius: '4px' }}
          ></div>
          <div 
            className="absolute inset-2 border-4 border-yellow-300 transform rotate-45 animate-pulse"
            style={{ borderRadius: '4px', animationDelay: '0.5s' }}
          ></div>
          <div 
            className="absolute inset-4 border-4 border-yellow-200 transform rotate-45 animate-pulse"
            style={{ borderRadius: '4px', animationDelay: '1s' }}
          ></div>
        </div>
      </div>
      <p className="text-xl font-semibold text-yellow-400 font-['Chakra_Petch']">{message}</p>
      <p className="text-sm mt-2 text-gray-300">Please wait...</p>
    </div>
  );
};

export default LoadingIndicator;