# Inventory System Upgrade

## Overview
The inventory system has been upgraded to support quantities and proper item tracking. This addresses the issue where the LLM was having trouble removing individual items from stacks (e.g., removing "1 Rifle Round" from "5 Rifle Rounds").

## Changes Made

### 1. New Data Structure
- Added `InventoryItem` interface in `types.ts`:
  ```typescript
  interface InventoryItem {
    name: string;
    quantity: number;
    displayName?: string;
  }
  ```

### 2. Utility Functions
Added comprehensive utility functions in `types.ts`:
- `parseInventoryItem()` - Converts strings to InventoryItem objects
- `formatInventoryItem()` - Formats InventoryItem for display
- `addToInventory()` - Adds items with quantity tracking
- `removeFromInventory()` - Removes items with quantity tracking
- `hasItem()` - Checks if player has required quantity
- `getItemQuantity()` - Gets current quantity of an item

### 3. Updated Components
- **InventoryDisplay.tsx**: Now displays quantities properly
- **App.tsx**: Uses new inventory management functions
- **types.ts**: Updated GeminiApiResponse to support both string and InventoryItem formats

### 4. LLM Instructions Updated
Updated `constants.ts` with new requirements:
- **QUANTITY FORMAT REQUIREMENT**: Items must use format "quantity item_name" (e.g., "5 Rifle Rounds")
- **QUANTITY TRACKING**: System automatically tracks quantities for same-named items

## How It Works

### Adding Items
- When LLM adds "3 Bandages" to inventory containing "2 Bandages", result is "5 Bandages"
- Single items use just the name (e.g., "Flashlight")

### Removing Items
- When LLM removes "1 Rifle Round" from "5 Rifle Rounds", result is "4 Rifle Rounds"
- When quantity reaches 0, item is completely removed

### Format Examples
- **Adding**: "5 Rifle Rounds", "3 Bandages", "Flashlight"
- **Removing**: "1 Rifle Round", "2 Bandages", "Flashlight"

## Backward Compatibility
- System maintains backward compatibility with existing string-based inventory
- API communication still uses string format for LLM compatibility
- Internal storage uses structured InventoryItem format

## Testing
A test function `testInventorySystem()` is included in `types.ts` to verify functionality.

## Benefits
1. **Accurate Quantity Tracking**: LLM can now properly decrement quantities
2. **Consistent Format**: Standardized format prevents parsing errors
3. **Better UX**: Players see clear quantity information
4. **Resource Management**: Enables realistic scenarios with limited resources
5. **Maintainable**: Clean separation between display and logic

## Usage Examples

### LLM Instructions
The LLM should now use these formats:
- Add items: `"addItem": "5 Rifle Rounds"`
- Remove items: `"removeItem": "1 Rifle Round"`
- Initial inventory: `["5 Rifle Rounds", "3 Bandages", "Flashlight"]`

### Code Usage
```typescript
// Adding items
inventory = addToInventory(inventory, "5 Rifle Rounds");

// Removing items
inventory = removeFromInventory(inventory, "1 Rifle Round");

// Checking quantities
if (hasItem(inventory, "Rifle Rounds", 3)) {
  // Player has at least 3 rifle rounds
}
``` 