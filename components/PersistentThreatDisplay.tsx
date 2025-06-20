

import React from 'react';
import { PersistentThreat } from '../types';

interface PersistentThreatDisplayProps {
  threat: PersistentThreat | null;
  message?: string | null;
  isInCombat?: boolean; // New prop
}

const getStatusColor = (status: PersistentThreat['status'], isInCombat?: boolean) => {
  if (isInCombat && status === 'engaged') return 'text-red-500 animate-pulse'; // Prominent combat warning
  switch (status) {
    case 'hidden': return 'text-gray-400';
    case 'very_distant': return 'text-sky-300'; 
    case 'distant': return 'text-blue-300';
    case 'closing_in': return 'text-yellow-400'; 
    case 'nearby': return 'text-yellow-300'; 
    case 'imminent': return 'text-orange-400';
    case 'engaged': return 'text-red-600 font-bold';
    case 'defeated': return 'text-green-400';
    default: return 'text-gray-300';
  }
};

const getDisplayStatusText = (status: PersistentThreat['status'], isInCombat?: boolean): string => {
  if (isInCombat && status === 'engaged') {
    return "WARNING!";
  }
  switch (status) {
    case 'hidden': return "Dormant";
    case 'very_distant': return "Remote";
    case 'distant': return "Approaching";
    case 'closing_in': return "Drawing Near";
    case 'nearby': return "Near";
    case 'imminent': return "Critical";
    case 'engaged': return "Crisis";
    case 'defeated': return "Neutralized";
    default: 
      // If status somehow ends up here and is not one of the known types,
      // TypeScript infers it as 'never'. Casting to string allows the fallback.
      return String(status).replace(/_/g, ' '); 
  }
};


const PersistentThreatDisplay: React.FC<PersistentThreatDisplayProps> = ({ threat, message, isInCombat }) => {
  if (!threat) {
    return null;
  }

  const displayMessage = message || threat.lastKnownAction;
  const statusColor = getStatusColor(threat.status, isInCombat);
  const statusDisplayText = getDisplayStatusText(threat.status, isInCombat);
  
  const ariaStatusDescription = statusDisplayText === "WARNING!" ? "Warning: Combat Engaged" : `Status: ${statusDisplayText}`;

  return (
    <div
      className={`bg-red-900 bg-opacity-60 backdrop-blur-sm p-3 rounded-lg shadow-xl mb-6 max-w-3xl w-full text-center border ${isInCombat && threat.status === 'engaged' ? 'border-red-500' : 'border-red-700'}`}
      title={threat.description} 
      aria-label={`Threat details: ${threat.name}. ${displayMessage || 'No specific action noted'}. ${ariaStatusDescription}.`}
    >
      <h4 className="text-md font-semibold text-red-300 mb-1">
        Threat: <span className="text-red-200 font-bold">{threat.name}</span>
      </h4>
      {displayMessage && !isInCombat && ( 
         <p className={`text-sm italic ${statusColor}`}>
            "{displayMessage}"
        </p>
      )}
      <p className={`text-sm uppercase tracking-wider font-medium mt-1 ${statusColor}`}>
        {statusDisplayText.startsWith("WARNING:") ? statusDisplayText : `Status: ${statusDisplayText}`}
      </p>
      {threat.senses && threat.senses.length > 0 && !isInCombat && (
        <div className="mt-2 pt-1 border-t border-red-700 border-opacity-50">
          <ul className="text-xs text-red-300 list-none p-0">
            {threat.senses.map((sense, index) => (
              <li key={index} className="inline-block mr-2 last:mr-0" title={sense}>
                <span role="img" aria-label="indicator icon" className="mr-1">👁️</span>{sense.split('(')[0].trim()} {/* Show only name, full desc on hover */}
              </li>
            ))}
          </ul>
        </div>
      )}
      {threat.status !== 'defeated' && threat.status !== 'hidden' && !isInCombat && (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 overflow-hidden">
          <div
            className="bg-red-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(threat.currentHealth / threat.maxHealth) * 100}%` }}
            title={`Threat Health: ${threat.currentHealth}/${threat.maxHealth}`}
            aria-label={`Threat health: ${threat.currentHealth} out of ${threat.maxHealth}`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default PersistentThreatDisplay;