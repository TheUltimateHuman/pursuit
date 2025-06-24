import React, { useState, useEffect, useRef } from 'react';

interface StoryDisplayProps {
  text: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const textRef = useRef(text);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset typing when text changes
  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text;
      setDisplayedText('');
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [text]);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      setIsTyping(false);
      return;
    }

    const typeSpeed = 15; // milliseconds per character
    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, isTyping]);

  // Cursor blinking effect
  useEffect(() => {
    if (!isTyping) {
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 800); // Slower blink for scene text
    } else {
      setShowCursor(true); // Keep cursor visible while typing
    }

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [isTyping]);

  // Split the displayed text by the divider and process each part
  const parts = displayedText.split('◈ ◈ ◈');
  
  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 shadow-2xl w-full border border-gray-600" style={{ borderRadius: '4px' }}>
      <div className="text-lg md:text-xl leading-relaxed text-gray-100 custom-scroll max-h-96 overflow-y-auto font-['Inter']">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <p className="whitespace-pre-line">
              {part}
              {index === parts.length - 1 && !isTyping && showCursor && (
                <span className="text-yellow-400 animate-pulse">|</span>
              )}
            </p>
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
