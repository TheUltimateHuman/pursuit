import React, { useState, useEffect, useRef } from 'react';

interface StoryDisplayProps {
  text: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text }) => {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showDivider, setShowDivider] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const parts = text.split('◈ ◈ ◈');
    let currentPart = 0;
    let currentCharIndex = 0;
    let accumulator = '';
    let cancelled = false;

    setTypedText('');
    setIsTyping(true);
    setShowDivider(false);

    function typeNextChar() {
      if (cancelled) return;
      if (currentPart >= parts.length) {
        setIsTyping(false);
        return;
      }
      const currentPartText = parts[currentPart];
      if (currentCharIndex < currentPartText.length) {
        accumulator = accumulator + currentPartText[currentCharIndex];
        setTypedText(accumulator);
        currentCharIndex++;
        timeoutRef.current = setTimeout(typeNextChar, 30);
      } else {
        if (currentPart < parts.length - 1) {
          setShowDivider(true);
          timeoutRef.current = setTimeout(() => {
            if (!cancelled) {
              setShowDivider(false);
              accumulator = accumulator + '◈ ◈ ◈';
              setTypedText(accumulator);
              currentPart++;
              currentCharIndex = 0;
              timeoutRef.current = setTimeout(typeNextChar, 200);
            }
          }, 500);
        } else {
          setIsTyping(false);
        }
      }
    }

    timeoutRef.current = setTimeout(typeNextChar, 100);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text]);

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
