import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  scenario?: string | null;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading...", scenario }) => {
  // Extract scenario name without prefix and suffix
  const getScenarioDisplayName = (scenarioText: string | null): string => {
    if (!scenarioText) return "PROCESSING";
    
    // Remove prefix (e.g., "REALISM:", "Historical:", "Science Fiction:")
    let cleanName = scenarioText.replace(/^(REALISM|Historical|Science Fiction|Fantasy|Mythological|Contemporary):\s*/i, '');
    
    // Remove suffix in parentheses at the end
    cleanName = cleanName.replace(/\s*\([^)]*\)$/, '');
    
    return cleanName.toUpperCase();
  };

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
      <p className="text-sm mt-2 text-gray-300">{getScenarioDisplayName(scenario || null)}</p>
    </div>
  );
};

export default LoadingIndicator;