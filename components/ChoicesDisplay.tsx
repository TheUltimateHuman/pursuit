import React from 'react';
import { Choice } from '../types'; 

interface ChoicesDisplayProps {
  choices: (string | Choice)[];
  onChoiceSelected: (choice: string | Choice) => void;
  disabled?: boolean;
}

const ChoicesDisplay: React.FC<ChoicesDisplayProps> = ({ choices, onChoiceSelected, disabled = false }) => {
  if (!choices || choices.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full">
      {choices.map((choice, index) => {
        const choiceText = typeof choice === 'string' ? choice : choice.text;
        return (
          <button
            key={index}
            onClick={() => onChoiceSelected(choice)}
            disabled={disabled}
            className={`w-full mb-3 p-4 text-left transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border ${
              choice.triggersCombat
                ? 'bg-red-800 text-white font-semibold py-3 px-5 shadow-md hover:bg-red-700 focus:ring-red-600 border-red-600'
                : 'bg-gray-600 text-white font-semibold py-3 px-5 shadow-md hover:bg-gray-500 focus:ring-gray-400 border-gray-400'
            }`}
            style={{ borderRadius: '4px' }}
            aria-label={`Choice: ${choiceText}`}
          >
            {choiceText}
          </button>
        );
      })}
    </div>
  );
};

export default ChoicesDisplay;
