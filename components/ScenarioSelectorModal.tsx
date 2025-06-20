import React, { useState, useMemo } from 'react';

interface ScenarioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioSelected: (scenario: string) => void;
  scenarios: string[];
}

const ScenarioSelectorModal: React.FC<ScenarioSelectorModalProps> = ({ isOpen, onClose, onScenarioSelected, scenarios }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScenarios = useMemo(() => {
    if (!searchTerm) {
      return scenarios;
    }
    return scenarios.filter(scenario =>
      scenario.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, scenarios]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-600"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-yellow-400">Select a Custom Scenario</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-gray-900 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="flex-grow p-4 overflow-y-auto custom-scroll">
          <ul className="space-y-2">
            {filteredScenarios.map((scenario, index) => (
              <li key={index}>
                <button
                  onClick={() => onScenarioSelected(scenario)}
                  className="w-full text-left p-3 bg-gray-700 hover:bg-red-800 rounded-md transition-colors duration-150"
                >
                  {scenario}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSelectorModal;