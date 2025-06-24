import React from 'react';

interface InventoryDisplayProps {
  items: string[];
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ items }) => {
  return (
    <div className="bg-gray-700 bg-opacity-60 backdrop-blur-md p-4 rounded-lg shadow-xl mb-6 max-w-3xl w-full transition-all duration-300 ease-in-out">
      <h3 className="text-lg font-semibold text-purple-300 mb-2 border-b border-purple-400 pb-1">Inventory:</h3>
      {items.length > 0 ? (
        <ul className="list-none text-gray-200 flex flex-col space-y-1 custom-scroll max-h-32 overflow-y-auto pr-2">
          {items.map((item, index) => (
            <li 
              key={index} 
              className="text-sm py-0.5 hover:text-purple-200 transition-colors duration-150" 
              title={item}
              aria-label={`Inventory item: ${item}`}
            >
              <span className="text-purple-400 mr-1.5">◆</span> {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 italic text-sm">Your satchel is empty.</p>
      )}
    </div>
  );
};

export default InventoryDisplay;