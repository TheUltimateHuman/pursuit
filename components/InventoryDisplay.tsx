import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, formatInventoryItem } from '../types';

interface InventoryDisplayProps {
  items: InventoryItem[];
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ items }) => {
  const [typedItems, setTypedItems] = useState<InventoryItem[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setTypedItems([]);
      setIsTyping(false);
      return;
    }

    let currentItemIndex = 0;
    let cancelled = false;
    setTypedItems([]);
    setIsTyping(true);

    function typeNextItem() {
      if (cancelled) return;
      if (currentItemIndex < items.length) {
        setTypedItems(items.slice(0, currentItemIndex + 1));
        currentItemIndex++;
        timeoutRef.current = setTimeout(typeNextItem, 100);
      } else {
        setIsTyping(false);
      }
    }

    timeoutRef.current = setTimeout(typeNextItem, 200);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items]);

  return (
    <div className="bg-yellow-800 bg-opacity-60 backdrop-blur-md p-4 shadow-xl mb-6 max-w-3xl w-full border border-yellow-600" style={{ borderRadius: '4px' }}>
      <h3 className="text-lg font-semibold text-yellow-200 mb-2 border-b border-yellow-300 pb-1 font-['Inter']">Inventory:</h3>
      <ul className="list-none text-gray-200 flex flex-col space-y-1 pr-2 font-['Inter']">
        {typedItems.length === 0 ? (
          <li className="text-sm text-gray-400 italic">Empty</li>
        ) : (
          typedItems.map((item, index) => (
            <li 
              key={index} 
              className="text-sm py-0.5 hover:text-yellow-200 transition-colors duration-150" 
              title={item.displayName || formatInventoryItem(item)}
              aria-label={`Inventory item: ${formatInventoryItem(item)}`}
            >
              <span className="text-yellow-400 mr-1.5">◆</span> {formatInventoryItem(item)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default InventoryDisplay;