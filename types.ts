

export interface Choice {
  text: string;
  triggersCombat?: boolean; // If this choice leads directly to combat
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
  addItem?: string;
  removeItem?: string;
  initialInventory?: string[]; // For player's starting items (1-3)
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