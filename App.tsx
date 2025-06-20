// App.tsx

import React, { useState, useEffect, useCallback } from 'react';

// --- TYPE DEFINITIONS (from types.ts) ---
interface Choice {
  text: string;
  triggersCombat?: boolean;
}

interface PersistentThreat {
  name: string;
  description: string;
  maxHealth: number;
  currentHealth: number;
  senses: string[];
  status: 'hidden' | 'very_distant' | 'distant' | 'closing_in' | 'nearby' | 'imminent' | 'engaged' | 'defeated';
  lastKnownAction: string;
}

interface CombatOutcome {
  playerDamageTaken?: number;
  playerHealingReceived?: number;
  enemyDamageTaken?: number;
  narration: string;
  isPlayerDefeated?: boolean;
  isEnemyDefeated?: boolean;
  combatContinues?: boolean;
}

interface PlayerAbility {
  name: string;
  description: string;
  uses?: number;
}

interface PlayerAbilityEffect {
  type: "player_ability_gain";
  abilityName: string;
  description: string;
  uses?: number;
}

interface StoryFlagEffect {
  type: "story_flag_set";
  flagName: string;
  value: any;
}

interface PursuerModifierEffect {
  type: "pursuer_modifier";
  modifierType: "weaken_permanently";
  magnitude: "minor" | "moderate" | "major";
}

interface PlayerAbilityUpdateEffect {
  type: "player_ability_update";
  abilityName: string;
  newUses?: number;
  description?: string;
}

interface PlayerAbilityRemoveEffect {
  type: "player_ability_remove";
  abilityName: string;
}

type GameplayEffect = PlayerAbilityEffect | StoryFlagEffect | PursuerModifierEffect | PlayerAbilityUpdateEffect | PlayerAbilityRemoveEffect;

interface GeminiApiResponse {
  sceneDescription: string;
  choices?: Choice[];
  combatChoices?: Choice[];
  addItem?: string;
  removeItem?: string;
  updatedThreatStatus?: PersistentThreat['status'];
  threatEncounterMessage?: string;
  combatOutcome?: CombatOutcome;
  memoryLogSummary?: string;
  gameplayEffects?: GameplayEffect[];
  gameOverSummary?: string;
  gameEndType?: "player_defeat" | "pursuer_combat_defeat" | "alternate_loss" | "alternate_win";
}

interface InitialStoryData extends GeminiApiResponse {
  initialInventory: string[];
  persistentThreatDetails: {
    name: string;
    description: string;
    maxHealth: number;
    senses: string[];
  };
}

interface StoryState {
  sceneDescription: string;
  choices: (string | Choice)[];
  persistentThreat: PersistentThreat | null;
  threatEncounterMessage: string | null;
  combatLog: string[];
  isInCombat: boolean;
}

// --- CONSTANTS (from constants.ts) ---
const MAX_PLAYER_HEALTH = 100;
const SCENARIO_THEMES_LIST: string[] = ["REALISM: Blackmailed into Becoming a Getaway Driver for a Heist", "Fantasy: Ancient Ruin Exploration Gone Wrong", "Science Fiction: Derelict Spaceship"];
// This is a simplified list for demonstration.

// Ordered list of threat statuses for the proximity indicator
const THREAT_STATUS_ORDER: PersistentThreat['status'][] = ['hidden', 'very_distant', 'distant', 'closing_in', 'nearby', 'imminent', 'engaged'];


// --- MOCK SERVICES (from services/geminiService.js and env.js) ---
const API_KEY_AVAILABLE = true; // Assume key is available for this component

// Mock API functions for demonstration
async function fetchInitialStory(theme: string): Promise<InitialStoryData> {
  console.log("Fetching initial story with theme:", theme);
  // In a real app, this would call the Gemini API
  await new Promise(res => setTimeout(res, 1000));
  return {
    sceneDescription: `You are a getaway driver, blackmailed into a heist that just went sideways. The screech of tires and the blare of alarms still echo in your ears. You swerved to avoid a police blockade, crashing the car into a rain-slicked alley wall. The engine is dead, steam hissing from the crumpled hood. The two bank robbers you were chauffeuring are slumped in the back, unconscious or worse. Sirens are closing in from all directions. A heavy, industrial-grade steel door is to your left, and a rickety fire escape is above you. The alley ends in a high, chain-link fence topped with barbed wire.`,
    initialInventory: ["Crowbar", "Flickering Zippo Lighter"],
    choices: [
        { text: "Use the crowbar on the steel door." },
        { text: "Try to climb the fire escape." },
        { text: "Check on the robbers in the back seat." },
        { text: "Attempt to scale the chain-link fence." }
    ],
    persistentThreatDetails: {
      name: "The Closing Net",
      description: "The combined, relentless force of the city police department. They are organized, communicating, and systematically locking down the area.",
      maxHealth: 100,
      senses: ["Helicopter Spotlights", "Radio Chatter", "Coordinated Search Patterns"],
    },
    updatedThreatStatus: 'distant',
    threatEncounterMessage: "The sound of sirens grows louder, echoing off the brick walls.",
    memoryLogSummary: "Started scenario: Blackmailed getaway driver. Crashed car in an alley after a botched heist.",
  };
}

async function fetchNextStorySegment(
  scene: string, choice: string, inventory: string[], health: number,
  threat: PersistentThreat | null, inCombat: boolean, isTriggeringCombat: boolean,
  memoryLog: string[], storyFlags: Record<string, any>, abilities: PlayerAbility[]
): Promise<GeminiApiResponse> {
  console.log("Fetching next story segment with choice:", choice);
  await new Promise(res => setTimeout(res, 1000));
  // Mock response for demonstration
  return {
    sceneDescription: "You jam the crowbar into the seam of the heavy steel door, putting all your weight into it. With a groan of tortured metal, the lock gives way. You slip inside, finding yourself in the dark, musty-smelling maintenance corridor of an old theater. A single, bare bulb flickers overhead, casting long, dancing shadows. The sirens sound slightly more muffled in here.",
    choices: [
        { text: "Move deeper into the corridor." },
        { text: "Barricade the door behind you." },
        { text: "Look for a light switch." },
        { text: "Listen at the door to gauge their proximity." }
    ],
    updatedThreatStatus: 'distant',
    threatEncounterMessage: "You can hear shouted commands outside, but they haven't found your entry point yet.",
    memoryLogSummary: "Forced open a steel door and entered a theater's maintenance corridor."
  };
}

// --- UI COMPONENTS ---

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-t-transparent border-red-500 rounded-full animate-spin"></div>
    <p className="mt-4 text-xl text-white">{message}</p>
  </div>
);

const StoryDisplay: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-gray-900 bg-opacity-75 backdrop-blur-sm p-6 rounded-lg shadow-xl w-full border border-gray-700">
    <p className="text-xl text-gray-200 leading-relaxed whitespace-pre-line">{text}</p>
  </div>
);

const ChoicesDisplay: React.FC<{ choices: (string | Choice)[], onChoiceSelected: (choice: string | Choice) => void, disabled: boolean }> = ({ choices, onChoiceSelected, disabled }) => (
  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
    {choices.map((choice, index) => (
      <button
        key={index}
        onClick={() => onChoiceSelected(choice)}
        disabled={disabled}
        className="w-full bg-red-900 text-white font-semibold py-4 px-5 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:bg-red-800 hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:bg-gray-600 disabled:text-gray-400 disabled:transform-none disabled:shadow-none"
      >
        {typeof choice === 'string' ? choice : choice.text}
      </button>
    ))}
  </div>
);

const InventoryDisplay: React.FC<{ items: string[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <div className="bg-gray-800 bg-opacity-60 backdrop-blur-md p-4 rounded-lg shadow-xl mb-6 max-w-3xl w-full">
      <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-600 pb-1">Inventory:</h3>
      <ul className="list-none text-gray-200 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item, index) => <li key={index} className="text-md">&#9670; {item}</li>)}
      </ul>
    </div>
  );
};

const PersistentThreatDisplay: React.FC<{ threat: PersistentThreat, message: string | null, isInCombat: boolean }> = ({ threat, message, isInCombat }) => {
    const currentStatusIndex = THREAT_STATUS_ORDER.indexOf(threat.status);

    return (
        <div className="bg-red-900 bg-opacity-50 backdrop-blur-md p-4 rounded-lg shadow-2xl mb-6 max-w-3xl w-full border-2 border-red-800">
            <h3 className="text-2xl font-bold text-red-300 mb-1 tracking-wider">{threat.name}</h3>
            <p className="text-md text-red-100 italic mb-3">"{message || threat.description}"</p>
            <div className="font-mono text-lg text-center tracking-widest bg-black bg-opacity-40 p-3 rounded-md">
                <span className="font-sans font-bold text-red-400 mr-3">STATUS:</span>
                <span className="text-red-200 uppercase">{threat.status.replace('_', ' ')}</span>
                
                {/* NEW Proximity Indicator */}
                <div className="mt-2 flex justify-center items-center space-x-2" aria-label={`Threat proximity: ${threat.status}`}>
                    {THREAT_STATUS_ORDER.map((status, index) => {
                        const isActive = (index === currentStatusIndex);
                        const isPast = (index < currentStatusIndex);
                        return (
                             <div 
                                key={status} 
                                className={`w-10 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : isPast ? 'bg-red-500' : 'bg-gray-600'}`}
                                title={status.replace('_', ' ')}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<StoryState>({
    sceneDescription: "Welcome to QUARRY.",
    choices: ["Begin"],
    persistentThreat: null,
    threatEncounterMessage: null,
    combatLog: [],
    isInCombat: false,
  });
  const [inventory, setInventory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  
  const [playerHealth, setPlayerHealth] = useState<number>(MAX_PLAYER_HEALTH);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameOverSummaryText, setGameOverSummaryText] = useState<string | null>(null);
  const [persistentThreat, setPersistentThreat] = useState<PersistentThreat | null>(null);
  const [isInCombat, setIsInCombat] = useState<boolean>(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [memoryLog, setMemoryLog] = useState<string[]>([]);
  
  const [storyFlags, setStoryFlags] = useState<Record<string, any>>({});
  const [playerAbilities, setPlayerAbilities] = useState<PlayerAbility[]>([]);

  const [isCustomChoiceInputVisible, setIsCustomChoiceInputVisible] = useState<boolean>(false);
  const [customChoiceText, setCustomChoiceText] = useState<string>("");
  const [lastUsedTheme, setLastUsedTheme] = useState<string | null>(null);

  const handleFatalError = useCallback((message: string, gameOver: boolean = true) => {
    setIsLoading(false);
    if (gameOver) setIsGameOver(true);
    setIsInCombat(false); 
    setIsCustomChoiceInputVisible(false);
    setError(message);
    setCurrentStory(prev => ({ ...prev, choices: [], isInCombat: false }));
  }, []);

  const processApiResponse = useCallback(async (
    apiResponsePromise: Promise<GeminiApiResponse | InitialStoryData>, 
    isInitial: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    if (isGameOver && !isInitial) {
        setIsGameOver(false); 
        setGameOverSummaryText(null);
    }
    setIsCustomChoiceInputVisible(false);

    try {
      const apiResponse = await apiResponsePromise as InitialStoryData & GeminiApiResponse;
      // ... (rest of the processing logic remains the same)

      if (isInitial) {
        setInventory(apiResponse.initialInventory || []);
        setIsInitialLoad(false);
        setPlayerHealth(MAX_PLAYER_HEALTH);
        setCombatLog([]);
        setIsInCombat(false);
        if (apiResponse.persistentThreatDetails) {
            const newThreat: PersistentThreat = {
                ...apiResponse.persistentThreatDetails,
                currentHealth: apiResponse.persistentThreatDetails.maxHealth,
                status: apiResponse.updatedThreatStatus || 'distant',
                lastKnownAction: apiResponse.threatEncounterMessage || "Lurking...",
            };
            setPersistentThreat(newThreat);
        }
      } else {
         if (persistentThreat && (apiResponse.updatedThreatStatus || apiResponse.threatEncounterMessage)) {
            let newStatus = apiResponse.updatedThreatStatus || persistentThreat.status;
            setPersistentThreat({
                ...persistentThreat,
                status: newStatus,
                lastKnownAction: apiResponse.threatEncounterMessage || persistentThreat.lastKnownAction
            });
         }
      }
      
      // Update inventory
      if (apiResponse.addItem) setInventory(prev => [...prev, apiResponse.addItem!]);
      if (apiResponse.removeItem) setInventory(prev => prev.filter(i => i !== apiResponse.removeItem));

      // Handle game over
      if (apiResponse.gameOverSummary) {
          setIsGameOver(true);
          setGameOverSummaryText(apiResponse.gameOverSummary);
          setCurrentStory({
              sceneDescription: apiResponse.sceneDescription,
              choices: [],
              persistentThreat: persistentThreat,
              threatEncounterMessage: apiResponse.threatEncounterMessage || null,
              combatLog: combatLog,
              isInCombat: false,
          });
          return;
      }
      
      setCurrentStory({
        sceneDescription: apiResponse.sceneDescription, 
        choices: apiResponse.choices || [],
        persistentThreat: persistentThreat,
        threatEncounterMessage: apiResponse.threatEncounterMessage || null,
        combatLog: combatLog,
        isInCombat: false, // simplified for this mock
      });

      // This is a simplified processApiResponse for demonstration
      // A full implementation would handle all fields like combat, effects, etc.

    } catch (err) {
      console.error("Error processing AI response:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      handleFatalError(`Story Interrupted: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [ isGameOver, handleFatalError, persistentThreat, combatLog ]);

  const startGame = useCallback(() => {
    setIsInitialLoad(true);
    setInventory([]);
    setPlayerHealth(MAX_PLAYER_HEALTH);
    setIsGameOver(false);
    setGameOverSummaryText(null); 
    setError(null);
    setPersistentThreat(null);
    setIsInCombat(false);
    setCombatLog([]);
    setMemoryLog([]); 
    setStoryFlags({}); 
    setPlayerAbilities([]); 
    setIsCustomChoiceInputVisible(false); 
    setLastUsedTheme(null);
    setCurrentStory({
        sceneDescription: "Welcome to QUARRY.",
        choices: ["Begin"],
        persistentThreat: null,
        threatEncounterMessage: null,
        combatLog: [],
        isInCombat: false,
    });
  }, []);

  const handleStartGameWithTheme = useCallback((theme: string) => {
    startGame(); 
    setLastUsedTheme(theme);
    processApiResponse(fetchInitialStory(theme), true);
  }, [startGame, processApiResponse]);

  const handleChoiceSelected = useCallback((choice: string | Choice) => {
    if (isGameOver) return;
    const choiceText = typeof choice === 'string' ? choice : choice.text;
    const isTriggeringCombat = typeof choice !== 'string' && !!choice.triggersCombat;
    if (!isInitialLoad) {
      processApiResponse(fetchNextStorySegment(
        currentStory.sceneDescription, choiceText, inventory, playerHealth, 
        persistentThreat, isInCombat, isTriggeringCombat, memoryLog, storyFlags, playerAbilities 
      ));
    }
  }, [
      isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, persistentThreat, 
      isInCombat, isGameOver, processApiResponse, memoryLog, storyFlags, playerAbilities
  ]);
  
  const handleRegenerateInitialScene = useCallback(() => {
    if (!API_KEY_AVAILABLE || isLoading) return;
    const themeToUse = lastUsedTheme || SCENARIO_THEMES_LIST[0];
    processApiResponse(fetchInitialStory(themeToUse), true);
  }, [processApiResponse, isLoading, lastUsedTheme]);

  if (!API_KEY_AVAILABLE) {
    return <div className="text-center text-2xl p-8">API Key Missing</div>;
  }
  
  const isDisplayingInitialStartOptions = isInitialLoad && !isLoading && currentStory.choices[0] === "Begin";
  const showRegenerateButton = !isInitialLoad && !isLoading && !isGameOver && !isCustomChoiceInputVisible && memoryLog.length <= 1;

  const themeButtonClass = "w-full font-semibold py-3 px-5 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 text-lg disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-gray-600 hover:bg-gray-500 focus:ring-gray-400 disabled:bg-gray-400 text-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 via-black to-red-800 text-white flex flex-col items-center justify-start p-4 selection:bg-red-700 selection:text-white font-sans">
      {isLoading && <LoadingIndicator message={isInitialLoad ? "Conjuring a scenario..." : "The story unfolds..."} />} 
      
      <header className="w-full max-w-3xl text-center my-6 md:my-8">
        <h1 className="text-8xl uppercase font-medium tracking-wider text-yellow-400 italic" style={{fontFamily: "'Times New Roman', serif"}}>
          QUARRY
        </h1>
      </header>

      <main className="w-full max-w-3xl flex flex-col items-center">
        
        {(!isInitialLoad || currentStory.sceneDescription !== "Welcome to QUARRY.") && (
              <div className="relative w-full max-w-3xl mb-8"> 
                <StoryDisplay text={currentStory.sceneDescription} />
                
                {/* MODIFIED REGENERATE BUTTON */}
                {showRegenerateButton && (
                    <button
                        onClick={handleRegenerateInitialScene}
                        disabled={isLoading}
                        className="absolute -top-3 -right-3 z-10 bg-sky-600 text-white font-bold p-2 rounded-full shadow-lg transition-all duration-150 ease-in-out hover:bg-sky-500 hover:shadow-xl transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border-2 border-sky-400"
                        title="Regenerate Initial Scene"
                        aria-label="Regenerate Initial Scene"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
                        </svg>
                    </button>
                )}
              </div>
        )}

        {persistentThreat && !isGameOver && !isInitialLoad && (
          <PersistentThreatDisplay 
            threat={persistentThreat} 
            message={currentStory.threatEncounterMessage}
            isInCombat={isInCombat} 
          />
        )}
        
        {!isGameOver && !isInitialLoad && (
          <div className="w-full max-w-lg text-center my-4">
            <div className="text-xl font-semibold text-red-300 mb-1">
              Health: {playerHealth} / {MAX_PLAYER_HEALTH}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 border-2 border-gray-600 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, (playerHealth / MAX_PLAYER_HEALTH) * 100)}%` }}
                aria-valuenow={playerHealth}
              ></div>
            </div>
          </div>
        )}

        {!isInitialLoad && <InventoryDisplay items={inventory} />}

        {/* ... other displays like abilities, combat log ... */}

        {isGameOver && (
          <div className="bg-black bg-opacity-80 p-6 rounded-lg shadow-xl mb-6 max-w-3xl w-full text-center border-2 border-red-700">
            <h2 className="text-3xl font-bold text-red-500 mb-3">GAME OVER</h2>
            <p className="text-xl mb-4 whitespace-pre-line text-gray-300">
              {gameOverSummaryText || "The End."}
            </p>
            <button 
              onClick={startGame}
              className={`${themeButtonClass} inline-block w-auto mt-2`}
            >
              Play Again
            </button>
          </div>
        )}

        {error && !isGameOver && ( 
          <div className="bg-red-800 bg-opacity-90 p-4 rounded-lg shadow-md mb-6 max-w-3xl w-full text-center">
            <p className="font-semibold text-yellow-300">Error:</p>
            <p className="text-gray-200">{error}</p>
          </div>
        )}
        
        <div className="w-full max-w-xl flex flex-col items-center mt-4 md:mt-6">
            {isDisplayingInitialStartOptions && (
                <button
                    onClick={() => handleStartGameWithTheme(SCENARIO_THEMES_LIST[0])}
                    className={themeButtonClass}
                    disabled={isLoading}
                >
                    Begin
                </button>
            )}

            {!isDisplayingInitialStartOptions && !isGameOver && !isLoading && (
                <ChoicesDisplay
                    choices={currentStory.choices}
                    onChoiceSelected={handleChoiceSelected}
                    disabled={isLoading}
                />
            )}
        </div> 
      </main>
    </div>
  );
};

export default App;
