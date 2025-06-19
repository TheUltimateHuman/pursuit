import React from 'react';

interface StoryDisplayProps {
  text: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text }) => {
  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 rounded-lg shadow-2xl mb-8 max-w-3xl w-full">
      <p className="text-lg md:text-xl leading-relaxed text-gray-100 whitespace-pre-line custom-scroll max-h-96 overflow-y-auto">
        {text}
      </p>
    </div>
  );
};

export default StoryDisplay;