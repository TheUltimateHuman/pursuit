import React, { useState, useMemo } from 'react';

interface ScenarioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioSelected: (scenario: string) => void;
  scenarios: string[];
}

interface GenreGroup {
  name: string;
  scenarios: string[];
}

const ScenarioSelectorModal: React.FC<ScenarioSelectorModalProps> = ({
  isOpen,
  onClose,
  onScenarioSelected,
  scenarios
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set());

  // Parse scenarios into genre groups
  const genreGroups = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    
    scenarios.forEach(scenario => {
      const colonIndex = scenario.indexOf(':');
      if (colonIndex !== -1) {
        const genre = scenario.substring(0, colonIndex);
        const scenarioName = scenario.substring(colonIndex + 1).trim();
        
        if (!groups[genre]) {
          groups[genre] = [];
        }
        groups[genre].push(scenarioName);
      }
    });

    // Convert to array and sort
    return Object.entries(groups)
      .map(([name, scenarios]) => ({ name, scenarios }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scenarios]);

  // Filter scenarios based on search term
  const filteredGenreGroups = useMemo(() => {
    if (!searchTerm.trim()) return genreGroups;
    
    return genreGroups
      .map(group => ({
        ...group,
        scenarios: group.scenarios.filter(scenario => 
          scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }))
      .filter(group => group.scenarios.length > 0);
  }, [genreGroups, searchTerm]);

  const toggleGenre = (genreName: string) => {
    const newExpanded = new Set(expandedGenres);
    if (newExpanded.has(genreName)) {
      newExpanded.delete(genreName);
    } else {
      newExpanded.add(genreName);
    }
    setExpandedGenres(newExpanded);
  };

  const handleScenarioClick = (genreName: string, scenarioName: string) => {
    const fullScenarioName = `${genreName}: ${scenarioName}`;
    onScenarioSelected(fullScenarioName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-600" style={{ borderRadius: '4px' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-yellow-400 font-['Chakra_Petch']">Select a Scenario</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-bold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
            style={{ borderRadius: '4px' }}
            aria-label="Close scenario selector"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-gray-900 text-white border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4" 
            style={{ borderRadius: '4px' }}
          />
          
          <div className="space-y-2">
            {filteredGenreGroups.map((group) => (
              <div key={group.name} className="border border-gray-600" style={{ borderRadius: '4px' }}>
                <button
                  onClick={() => toggleGenre(group.name)}
                  className="w-full p-4 text-left bg-gray-700 hover:bg-gray-600 transition-colors duration-150 flex justify-between items-center"
                  style={{ borderRadius: '4px' }}
                >
                  <span className="text-lg font-semibold text-yellow-400">{group.name === 'REALISM' ? 'Realism' : group.name}</span>
                  <span className="text-gray-400 text-xl">
                    {expandedGenres.has(group.name) ? '−' : '+'}
                  </span>
                </button>
                
                {expandedGenres.has(group.name) && (
                  <div className="bg-gray-800 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {group.scenarios.map((scenario, index) => (
                        <button
                          key={index}
                          onClick={() => handleScenarioClick(group.name, scenario)}
                          className="p-3 text-left bg-gray-700 hover:bg-gray-600 transition-colors duration-150 text-sm border border-gray-600"
                          style={{ borderRadius: '4px' }}
                        >
                          {scenario}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSelectorModal;