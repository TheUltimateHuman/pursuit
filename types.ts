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
  redacted?: boolean;
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
  addItem?: string;
  removeItem?: string;
  initialInventory?: string[]; // For player's starting items (1-3)
  playerMaxHealth?: number; // For setting player's starting health based on character description
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
  const newItem = parseInventoryItem(item);
  const existingItemIndex = inventory.findIndex(invItem => invItem.name === newItem.name);
  
  if (existingItemIndex >= 0) {
    // Update existing item quantity
    const updatedInventory = [...inventory];
    updatedInventory[existingItemIndex] = {
      ...updatedInventory[existingItemIndex],
      quantity: updatedInventory[existingItemIndex].quantity + newItem.quantity
    };
    return updatedInventory;
  } else {
    // Add new item
    return [...inventory, newItem];
  }
};

export const removeFromInventory = (inventory: InventoryItem[], item: string | InventoryItem): InventoryItem[] => {
  const itemToRemove = parseInventoryItem(item);
  const existingItemIndex = inventory.findIndex(invItem => invItem.name === itemToRemove.name);
  
  if (existingItemIndex >= 0) {
    const existingItem = inventory[existingItemIndex];
    const newQuantity = existingItem.quantity - itemToRemove.quantity;
    
    if (newQuantity <= 0) {
      // Remove item completely
      return inventory.filter((_, index) => index !== existingItemIndex);
    } else {
      // Update quantity
      const updatedInventory = [...inventory];
      updatedInventory[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity
      };
      return updatedInventory;
    }
  }
  
  return inventory; // Item not found, return unchanged inventory
};

export const hasItem = (inventory: InventoryItem[], itemName: string, quantity: number = 1): boolean => {
  const item = inventory.find(invItem => invItem.name === itemName);
  return item ? item.quantity >= quantity : false;
};

export const getItemQuantity = (inventory: InventoryItem[], itemName: string): number => {
  const item = inventory.find(invItem => invItem.name === itemName);
  return item ? item.quantity : 0;
};