import React, { useState, useEffect } from 'react';

interface StoryDisplayProps {
  text: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text }) => {
  const [typedText, setTypedText] = useState('');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showDivider, setShowDivider] = useState(false);

  useEffect(() => {
    // Split the text by the divider and process each part
    const parts = text.split('◈ ◈ ◈');
    
    // Reset typing state when text changes
    setTypedText('');
    setCurrentPartIndex(0);
    setIsTyping(true);
    setShowDivider(false);

    let currentCharIndex = 0;
    let currentPart = 0;
    let cancelled = false;

    function typeNextChar() {
      if (cancelled) return;

      if (currentPart >= parts.length) {
        setIsTyping(false);
        return;
      }

      const currentPartText = parts[currentPart];
      
      if (currentCharIndex < currentPartText.length) {
        setTypedText(prev => prev + currentPartText[currentCharIndex]);
        currentCharIndex++;
        setTimeout(typeNextChar, 30); // Faster typing speed than title
      } else {
        // Finished typing current part
        if (currentPart < parts.length - 1) {
          // Show divider for a moment before continuing
          setShowDivider(true);
          setTimeout(() => {
            if (!cancelled) {
              setShowDivider(false);
              setTypedText(prev => prev + '◈ ◈ ◈');
              currentPart++;
              currentCharIndex = 0;
              setTimeout(typeNextChar, 200); // Pause before next part
            }
          }, 500); // Show divider for 500ms
        } else {
          // Finished all parts
          setIsTyping(false);
        }
      }
    }

    // Start typing after a short delay
    setTimeout(typeNextChar, 100);

    return () => {
      cancelled = true;
    };
  }, [text]); // Only depend on text, not parts

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 shadow-2xl w-full border border-gray-600" style={{ borderRadius: '4px' }}>
      <div className="text-lg md:text-xl leading-relaxed text-gray-100 font-['Inter']">
        <p className="whitespace-pre-line">
          {typedText}
          {isTyping && <span className="text-yellow-400 animate-pulse">|</span>}
        </p>
        {showDivider && (
          <div className="flex justify-center my-4">
            <span className="text-yellow-400 text-2xl font-light">◈ ◈ ◈</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryDisplay;
