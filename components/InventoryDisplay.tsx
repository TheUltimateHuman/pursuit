import React from 'react';
import { InventoryItem, formatInventoryItem } from '../types';

interface InventoryDisplayProps {
  items: InventoryItem[];
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ items }) => {
  return (
    <div className="bg-yellow-800 bg-opacity-60 backdrop-blur-md p-4 shadow-xl mb-6 max-w-3xl w-full border border-yellow-600" style={{ borderRadius: '4px' }}>
      <h3 className="text-lg font-semibold text-yellow-200 mb-2 border-b border-yellow-300 pb-1 font-['Inter']">Inventory:</h3>
      <ul className="list-none text-gray-200 flex flex-col space-y-1 custom-scroll max-h-24 overflow-y-auto pr-2 font-['Inter']">
        {items.length === 0 ? (
          <li className="text-sm text-gray-400 italic">Empty</li>
        ) : (
          items.map((item, index) => (
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