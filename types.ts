export interface Choice {
  text: string;
  triggersCombat?: boolean; // If this choice leads directly to combat
}

export interface InventoryItem {
  name: string;
  quantity: number;
  displayName?: string; // Optional: for custom display names like "Rifle Rounds (5)"
}

export interface PersistentThreat {
  name: string;
  description: string;
  status: 'hidden' | 'very_distant' | 'distant' | 'closing_in' | 'nearby' | 'imminent' | 'engaged' | 'defeated';
  maxHealth: number;
  currentHealth: number;
  senses?: string[]; // Primary senses for detection (e.g., "Acute Hearing", "Thermal Vision")
  lastKnownAction?: string;
}

export interface CombatOutcome {
  playerDamageTaken: number;
  enemyDamageTaken: number;
  playerHealingReceived?: number; // Healing received by the player this turn
  narration: string; // Description of the combat turn's events
  isPlayerDefeated: boolean;
  isEnemyDefeated: boolean;
  combatContinues: boolean;
}

// --- New Gameplay Effect Types ---
export interface PlayerAbilityEffect {
  type: "player_ability_gain";
  abilityName: string;
  description: string; // How it was gained, what it might do
  uses?: number; // Optional, for limited-use abilities
}

export interface StoryFlagEffect {
  type: "story_flag_set";
  flagName: string;
  value: string | boolean | number;
  description: string; // Context for the flag
}

export interface PursuerModifierEffect {
  type: "pursuer_modifier";
  modifierType: "weaken_temporarily" | "weaken_permanently" | "enrage" | "distract" | "strengthen_temporarily" | "strengthen_permanently";
  magnitude?: "minor" | "moderate" | "major"; // For weaken/strengthen
  durationTurns?: number; // For temporary effects (AI managed via context)
  description: string; // How this occurred and its narrative implication
}

export interface PlayerAbilityUpdateEffect {
  type: "player_ability_update";
  abilityName: string;
  newUses: number;
  description?: string; // Optional: context for the update
}

export interface PlayerAbilityRemoveEffect {
  type: "player_ability_remove";
  abilityName: string;
  description?: string; // Optional: context for the removal
}

export type GameplayEffect = 
  | PlayerAbilityEffect 
  | StoryFlagEffect 
  | PursuerModifierEffect
  | PlayerAbilityUpdateEffect
  | PlayerAbilityRemoveEffect;
// --- End New Gameplay Effect Types ---

export interface GeminiApiResponse {
  sceneDescription: string;
  choices: (string | Choice)[]; // Can be simple strings or Choice objects
  addItem?: string | InventoryItem; // Can be string (legacy) or structured InventoryItem
  removeItem?: string | InventoryItem; // Can be string (legacy) or structured InventoryItem
  initialInventory?: (string | InventoryItem)[]; // For player's starting items (1-3)
  memoryLogSummary?: string; // Concise summary of the current turn for the memory log
  gameplayEffects?: GameplayEffect[]; // New field for emergent effects
  gameOverSummary?: string; // New: Concise summary of game end (e.g., "You perished.")
  gameEndType?: 'player_defeat' | 'pursuer_combat_defeat' | 'alternate_win' | 'alternate_loss'; // New field for specific game end types


  persistentThreatDetails?: { // For initial generation
    name: string;
    description: string;
    maxHealth: number;
    senses?: string[]; // Primary senses defined at pursuer creation
  };
  updatedThreatStatus?: PersistentThreat['status'];
  threatEncounterMessage?: string;

  combatOutcome?: CombatOutcome;
  combatChoices?: (string | Choice)[]; // Specific choices during combat
}

export interface StoryState {
  sceneDescription: string;
  
  choices: (string | Choice)[];
  persistentThreat?: PersistentThreat | null;
  threatEncounterMessage?: string | null;
  combatLog: string[];
  isInCombat: boolean;
}

// For grounding metadata, if used
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
}
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

// Inventory utility functions
export const parseInventoryItem = (item: string | InventoryItem): InventoryItem => {
  if (typeof item === 'string') {
    // Try to parse quantity from string format like "5 Rifle Rounds" or "Rifle Rounds (5)"
    const quantityMatch = item.match(/^(\d+)\s+(.+)$/);
    const parenthesesMatch = item.match(/^(.+?)\s*\((\d+)\)$/);
    
    if (quantityMatch) {
      return {
        name: quantityMatch[2].trim(),
        quantity: parseInt(quantityMatch[1]),
        displayName: item
      };
    } else if (parenthesesMatch) {
      return {
        name: parenthesesMatch[1].trim(),
        quantity: parseInt(parenthesesMatch[2]),
        displayName: item
      };
    } else {
      return {
        name: item,
        quantity: 1,
        displayName: item
      };
    }
  }
  return item;
};

export const formatInventoryItem = (item: InventoryItem): string => {
  if (item.quantity === 1) {
    return item.name;
  }
  return `${item.quantity} ${item.name}`;
};

export const addToInventory = (inventory: InventoryItem[], item: string | InventoryItem): InventoryItem[] => {
  const parsedItem = parseInventoryItem(item);
  const existingIndex = inventory.findIndex(invItem => invItem.name === parsedItem.name);
  
  if (existingIndex >= 0) {
    // Item exists, add to quantity
    const updatedInventory = [...inventory];
    updatedInventory[existingIndex] = {
      ...updatedInventory[existingIndex],
      quantity: updatedInventory[existingIndex].quantity + parsedItem.quantity
    };
    return updatedInventory;
  } else {
    // New item
    return [...inventory, parsedItem];
  }
};

export const removeFromInventory = (inventory: InventoryItem[], item: string | InventoryItem): InventoryItem[] => {
  const parsedItem = parseInventoryItem(item);
  const existingIndex = inventory.findIndex(invItem => invItem.name === parsedItem.name);
  
  if (existingIndex >= 0) {
    const existingItem = inventory[existingIndex];
    const newQuantity = existingItem.quantity - parsedItem.quantity;
    
    if (newQuantity <= 0) {
      // Remove item completely
      return inventory.filter((_, index) => index !== existingIndex);
    } else {
      // Reduce quantity
      const updatedInventory = [...inventory];
      updatedInventory[existingIndex] = {
        ...existingItem,
        quantity: newQuantity
      };
      return updatedInventory;
    }
  }
  
  // Item not found, return unchanged inventory
  return inventory;
};

export const hasItem = (inventory: InventoryItem[], itemName: string, requiredQuantity: number = 1): boolean => {
  const item = inventory.find(invItem => invItem.name === itemName);
  return item ? item.quantity >= requiredQuantity : false;
};

export const getItemQuantity = (inventory: InventoryItem[], itemName: string): number => {
  const item = inventory.find(invItem => invItem.name === itemName);
  return item ? item.quantity : 0;
};

// Test function to verify inventory system
export const testInventorySystem = () => {
  console.log("Testing inventory system...");
  
  let inventory: InventoryItem[] = [];
  
  // Test adding items
  inventory = addToInventory(inventory, "5 Rifle Rounds");
  console.log("After adding 5 Rifle Rounds:", inventory);
  
  inventory = addToInventory(inventory, "3 Bandages");
  console.log("After adding 3 Bandages:", inventory);
  
  inventory = addToInventory(inventory, "2 Rifle Rounds");
  console.log("After adding 2 more Rifle Rounds:", inventory);
  
  // Test removing items
  inventory = removeFromInventory(inventory, "1 Rifle Round");
  console.log("After removing 1 Rifle Round:", inventory);
  
  inventory = removeFromInventory(inventory, "2 Bandages");
  console.log("After removing 2 Bandages:", inventory);
  
  // Test removing all of an item
  inventory = removeFromInventory(inventory, "6 Rifle Rounds");
  console.log("After removing all Rifle Rounds:", inventory);
  
  console.log("Inventory system test completed.");
};