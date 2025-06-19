
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
            className={`
              bg-gray-600 text-white font-semibold py-3 px-5 rounded-lg shadow-md 
              transition-all duration-150 ease-in-out 
              hover:bg-gray-500 hover:shadow-lg transform hover:scale-105 
              focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 
              disabled:bg-gray-400 disabled:text-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
              text-left break-words
            `}
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
