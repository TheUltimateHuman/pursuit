import React from 'react';

interface StoryDisplayProps {
  text: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text }) => {
  // Split the text by the divider and process each part
  const parts = text.split('◈ ◈ ◈');
  
  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 shadow-2xl w-full border border-gray-600" style={{ borderRadius: '4px' }}>
      <div className="text-lg md:text-xl leading-relaxed text-gray-100 font-['Inter']">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <p className="whitespace-pre-line">{part}</p>
            {index < parts.length - 1 && (
              <div className="flex justify-center my-4">
                <span className="text-yellow-400 text-2xl font-light">◈ ◈ ◈</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StoryDisplay;
