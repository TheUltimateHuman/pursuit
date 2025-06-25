import React, { useState, useEffect, useRef } from 'react';

interface StoryDisplayProps {
  text: string;
  onTypingStateChange?: (isTyping: boolean) => void;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text, onTypingStateChange }) => {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let currentCharIndex = 0;
    let cancelled = false;
    setTypedText('');
    setIsTyping(true);
    onTypingStateChange?.(true);

    function typeNextChar() {
      if (cancelled) return;
      if (currentCharIndex < text.length) {
        setTypedText(text.slice(0, currentCharIndex + 1));
        currentCharIndex++;
        timeoutRef.current = setTimeout(typeNextChar, 30);
      } else {
        setIsTyping(false);
        onTypingStateChange?.(false);
      }
    }

    timeoutRef.current = setTimeout(typeNextChar, 100);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, onTypingStateChange]);

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 shadow-2xl w-full border border-gray-600" style={{ borderRadius: '4px' }}>
      <div className="text-lg md:text-xl leading-relaxed text-gray-100 font-['Inter']">
        <p className="whitespace-pre-line">
          {typedText}
          {isTyping && <span className="text-yellow-400 animate-pulse">|</span>}
        </p>
      </div>
    </div>
  );
};

export default StoryDisplay;
