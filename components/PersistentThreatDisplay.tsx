import React from 'react';
import { PersistentThreat } from '../types';

interface PersistentThreatDisplayProps {
  threat: PersistentThreat | null;
  message?: string | null;
  isInCombat?: boolean;
}

const getVisualIndicator = (status: PersistentThreat['status'], isInCombat?: boolean) => {
  if (isInCombat && status === 'engaged') {
    return {
      position: 5,
      color: 'bg-red-500',
      animation: 'animate-pulse',
      title: 'WARNING! Combat Engaged'
    };
  }
  
  switch (status) {
    case 'hidden':
      return { position: 0, color: 'bg-gray-400', animation: '', title: 'Hidden/Dormant' };
    case 'very_distant':
      return { position: 1, color: 'bg-sky-300', animation: '', title: 'Very Distant' };
    case 'distant':
      return { position: 2, color: 'bg-blue-300', animation: '', title: 'Distant' };
    case 'closing_in':
      return { position: 3, color: 'bg-yellow-400', animation: 'animate-pulse', title: 'Closing In' };
    case 'nearby':
      return { position: 4, color: 'bg-yellow-300', animation: 'animate-pulse', title: 'Nearby' };
    case 'imminent':
      return { position: 5, color: 'bg-orange-400', animation: 'animate-pulse', title: 'Imminent' };
    case 'engaged':
      return { position: 5, color: 'bg-red-600', animation: 'animate-pulse', title: 'Engaged' };
    case 'defeated':
      return { position: 0, color: 'bg-green-400', animation: '', title: 'Defeated' };
    default:
      return { position: 0, color: 'bg-gray-300', animation: '', title: 'Unknown Status' };
  }
};

const PersistentThreatDisplay: React.FC<PersistentThreatDisplayProps> = ({ threat, message, isInCombat }) => {
  if (!threat) {
    return null;
  }

  const displayMessage = message || threat.lastKnownAction;
  const visualIndicator = getVisualIndicator(threat.status, isInCombat);
  
  const ariaStatusDescription = visualIndicator.title;

  return (
    <div
      className={`bg-red-900 bg-opacity-60 backdrop-blur-sm p-3 shadow-xl mb-6 max-w-3xl w-full text-center border ${isInCombat && threat.status === 'engaged' ? 'border-red-500' : 'border-red-700'}`}
      style={{ borderRadius: '4px' }}
      title={threat.description} 
      aria-label={`Threat details: ${threat.redacted ? '[REDACTED]' : threat.name}. ${displayMessage || 'No specific action noted'}. ${ariaStatusDescription}.`}
    >
      <h4 className="text-md font-semibold text-red-300 mb-1">
        DANGER: {threat.redacted ? (
          <span className="font-bold px-2 py-0.5 rounded" style={{ background: 'black', color: '#ffe066', letterSpacing: '0.08em' }} aria-label="Threat name is redacted">[REDACTED]</span>
        ) : (
          <span className="text-red-200 font-bold">{threat.name}</span>
        )}
      </h4>
      {displayMessage && !isInCombat && ( 
         <p className="text-sm italic text-red-300">
            "{displayMessage}"
        </p>
      )}
      <div className="flex items-center justify-center mt-2">
        {threat.status === 'engaged' ? (
          <div className="text-red-500 animate-pulse font-bold text-lg" title="WARNING! Combat Engaged" aria-label="WARNING! Combat Engaged">
            WARNING!
          </div>
        ) : threat.status === 'defeated' ? (
          <div className="text-green-400 font-bold text-lg" title="Safe - Threat Defeated" aria-label="Safe - Threat Defeated">
            SAFE
          </div>
        ) : (
          <div className={`flex items-center justify-between w-full px-4 ${visualIndicator.animation}`} title={visualIndicator.title} aria-label={visualIndicator.title}>
            {[0, 1, 2, 3, 4, 5].map((pos) => (
              <div
                key={pos}
                className={`h-2 flex-1 mx-1 transition-all duration-300 ${
                  pos === visualIndicator.position 
                    ? `${visualIndicator.color} shadow-lg` 
                    : 'bg-white bg-opacity-30'
                }`}
                style={{ borderRadius: '2px' }}
              />
            ))}
          </div>
        )}
      </div>
      {threat.status !== 'defeated' && threat.status !== 'hidden' && !isInCombat && (
        <div className="w-full bg-gray-700 h-2.5 mt-2 overflow-hidden" style={{ borderRadius: '2px' }}>
          <div
            className="bg-red-600 h-2.5 transition-all duration-500 ease-out"
            style={{ width: `${(threat.currentHealth / threat.maxHealth) * 100}%`, borderRadius: '1px' }}
            title={`Threat Health: ${threat.currentHealth}/${threat.maxHealth}`}
            aria-label={`Threat health: ${threat.currentHealth} out of ${threat.maxHealth}`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default PersistentThreatDisplay;