// App.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- TYPE DEFINITIONS ---
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

interface PlayerAbilityEffect { type: "player_ability_gain"; abilityName: string; description: string; uses?: number; }
interface StoryFlagEffect { type: "story_flag_set"; flagName: string; value: any; }
interface PursuerModifierEffect { type: "pursuer_modifier"; modifierType: "weaken_permanently"; magnitude: "minor" | "moderate" | "major"; }
interface PlayerAbilityUpdateEffect { type: "player_ability_update"; abilityName: string; newUses?: number; description?: string; }
interface PlayerAbilityRemoveEffect { type: "player_ability_remove"; abilityName: string; }
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
  persistentThreatDetails: { name: string; description: string; maxHealth: number; senses: string[]; };
}

interface StoryState {
  sceneDescription: string;
  choices: (string | Choice)[];
  persistentThreat: PersistentThreat | null;
  threatEncounterMessage: string | null;
  combatLog: string[];
  isInCombat: boolean;
}

// --- CONSTANTS ---
const MAX_PLAYER_HEALTH = 100;
const SCENARIO_THEMES_LIST: string[] = [ "REALISM: Blackmailed into Becoming a Getaway Driver for a Heist", "Fantasy: Ancient Ruin Exploration Gone Wrong", "Science Fiction: Derelict Spaceship", "Historical: Victorian Era Occult Mystery", "Contemporary & Mundane: Remote Wilderness Survival/Isolation", "Mystery/Thriller: Detective Investigating a Bizarre Case" ];
const THREAT_STATUS_ORDER: PersistentThreat['status'][] = ['hidden', 'very_distant', 'distant', 'closing_in', 'nearby', 'imminent', 'engaged'];
const MAX_MEMORY_LOG_ENTRIES = 5;
type ThemeType = "random" | "realism" | "historical" | "modern" | "sci_fi" | "fantasy";

// --- MOCK SERVICES ---
const API_KEY_AVAILABLE = true;

async function fetchInitialStory(theme: string): Promise<InitialStoryData> {
  console.log("Fetching initial story with theme:", theme);
  await new Promise(res => setTimeout(res, 1000));
  return {
    sceneDescription: `You are a getaway driver, blackmailed into a heist that just went sideways. The screech of tires and the blare of alarms still echo in your ears. You swerved to avoid a police blockade, crashing the car into a rain-slicked alley wall. The engine is dead, steam hissing from the crumpled hood. The two bank robbers you were chauffeuring are slumped in the back, unconscious or worse. Sirens are closing in from all directions. A heavy, industrial-grade steel door is to your left, and a rickety fire escape is above you. The alley ends in a high, chain-link fence topped with barbed wire.`,
    initialInventory: ["Crowbar", "Flickering Zippo Lighter"],
    choices: [
        { text: "Use the crowbar on the steel door." }, { text: "Try to climb the fire escape." },
        { text: "Check on the robbers in the back seat." }, { text: "Attempt to scale the chain-link fence." }
    ],
    persistentThreatDetails: { name: "The Closing Net", description: "The combined, relentless force of the city police department.", maxHealth: 100, senses: ["Helicopter Spotlights", "Radio Chatter"] },
    updatedThreatStatus: 'distant',
    threatEncounterMessage: "The sound of sirens grows louder.",
    memoryLogSummary: "Started scenario: Getaway driver. Crashed car in an alley.",
  };
}

async function fetchNextStorySegment(scene: string, choice: string, inventory: string[], health: number, threat: PersistentThreat | null, inCombat: boolean, isTriggeringCombat: boolean, memoryLog: string[], storyFlags: Record<string, any>, abilities: PlayerAbility[]): Promise<GeminiApiResponse> {
  console.log("Fetching next story segment with choice:", choice);
  await new Promise(res => setTimeout(res, 1000));
  return {
    sceneDescription: "You jam the crowbar into the seam of the heavy steel door. With a groan of tortured metal, the lock gives way. You slip inside, finding yourself in the dark, musty-smelling maintenance corridor of an old theater. A single, bare bulb flickers overhead, casting long, dancing shadows. The sirens sound slightly more muffled in here.",
    choices: [
        { text: "Move deeper into the corridor." }, { text: "Barricade the door behind you." },
        { text: "Look for a light switch." }, { text: "Listen at the door." }
    ],
    updatedThreatStatus: 'closing_in',
    threatEncounterMessage: "You can hear shouted commands outside, but they haven't found your entry point yet.",
    memoryLogSummary: "Forced open a steel door into a theater corridor."
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

// This is a recreated mock of the modal component for self-containment.
const ScenarioSelectorModal: React.FC<{ isOpen: boolean; onClose: () => void; onScenarioSelected: (scenario: string) => void; scenarios: string[]; }> = ({ isOpen, onClose, onScenarioSelected, scenarios }) => {
    if (!isOpen) return null;
    const [searchTerm, setSearchTerm] = useState('');
    const filteredScenarios = scenarios.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-yellow-400 rounded-lg shadow-2xl max-w-2xl w-full flex flex-col" style={{maxHeight: '80vh'}}>
                <h2 className="text-2xl text-yellow-400 p-4 border-b border-gray-700">Select a Custom Scenario</h2>
                <div className="p-4">
                    <input
                        type="text"
                        placeholder="Search scenarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white focus:ring-yellow-400 focus:border-yellow-400"
                    />
                </div>
                <div className="overflow-y-auto flex-grow p-4">
                    <ul className="space-y-2">
                        {filteredScenarios.map(scenario => (
                            <li key={scenario}>
                                <button
                                    onClick={() => onScenarioSelected(scenario)}
                                    className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded transition-colors duration-150"
                                >
                                    {scenario}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-700 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-red-800 hover:bg-red-700 rounded text-white font-semibold">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


const PersistentThreatDisplay: React.FC<{ threat: PersistentThreat, message: string | null, isInCombat: boolean }> = ({ threat, message }) => {
    const currentStatusIndex = THREAT_STATUS_ORDER.indexOf(threat.status);

    return (
        <div className="bg-red-900 bg-opacity-50 backdrop-blur-md p-4 rounded-lg shadow-2xl mb-6 max-w-3xl w-full border-2 border-red-800">
            <h3 className="text-2xl font-bold text-red-300 mb-1 tracking-wider">{threat.name}</h3>
            <p className="text-md text-red-100 italic mb-3">"{message || threat.description}"</p>
            <div className="font-mono text-lg text-center tracking-widest bg-black bg-opacity-40 p-3 rounded-md">
                <span className="font-sans font-bold text-red-400 mr-3">STATUS:</span>
                <span className="text-red-200 uppercase">{threat.status.replace('_', ' ')}</span>
                
                <div className="mt-2 flex justify-center items-center space-x-2" aria-label={`Threat proximity: ${threat.status}`}>
                    {THREAT_STATUS_ORDER.map((status, index) => (
                         <div 
                            key={status} 
                            className={`w-10 h-2 rounded-full transition-all duration-300 ${index === currentStatusIndex ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : index < currentStatusIndex ? 'bg-red-500' : 'bg-gray-600'}`}
                            title={status.replace('_', ' ')}
                        />
                    ))}
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
    persistentThreat: null, threatEncounterMessage: null, combatLog: [], isInCombat: false,
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
  const [lastUsedThemeType, setLastUsedThemeType] = useState<ThemeType | null>(null);
  
  const [isCustomScenarioModalVisible, setIsCustomScenarioModalVisible] = useState<boolean>(false);

  const handleFatalError = useCallback((message: string, gameOver: boolean = true, isNarrativeDefeat: boolean = false, narrativeDemiseScene?: string) => {
    setIsLoading(false);
    if (gameOver) setIsGameOver(true);
    setIsInCombat(false); 
    setIsCustomChoiceInputVisible(false);

    if (isNarrativeDefeat && gameOver) { 
      setError(null); 
      setCurrentStory(prev => ({ ...prev, sceneDescription: narrativeDemiseScene || prev.sceneDescription, choices: [], isInCombat: false }));
    } else { 
      setError(message);
      setCurrentStory(prev => ({ ...prev, choices: gameOver ? [] : prev.choices, isInCombat: false }));
    }
  }, []);

  const processApiResponse = useCallback(async (
    apiResponsePromise: Promise<GeminiApiResponse | InitialStoryData>, isInitial: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    if (isGameOver && !isInitial) { setIsGameOver(false); setGameOverSummaryText(null); }
    setIsCustomChoiceInputVisible(false);

    try {
      const apiResponse = await apiResponsePromise as InitialStoryData & GeminiApiResponse;
      // This is a much more complete implementation than the last turn's simplified one
      const { sceneDescription, choices, addItem, removeItem, persistentThreatDetails, updatedThreatStatus, threatEncounterMessage, initialInventory, combatOutcome, combatChoices, memoryLogSummary, gameplayEffects, gameOverSummary } = apiResponse;
      
      if (!sceneDescription || (!choices && !combatChoices && !isGameOver && !(combatOutcome && (combatOutcome.isPlayerDefeated || combatOutcome.isEnemyDefeated)) && !gameOverSummary)) {
        throw new Error("AI response incomplete.");
      }
      
      let tempPlayerHealth = playerHealth; 
      let tempPersistentThreat = persistentThreat;
      let tempMemoryLog = memoryLog;
      let tempStoryFlags = storyFlags;
      let tempPlayerAbilities = [...playerAbilities];

      if (memoryLogSummary) {
        tempMemoryLog = isInitial ? [memoryLogSummary] : [...tempMemoryLog, memoryLogSummary].slice(-MAX_MEMORY_LOG_ENTRIES);
        setMemoryLog(tempMemoryLog);
      } else if (isInitial) { setMemoryLog([]); }

      if (isInitial) { tempStoryFlags = {}; tempPlayerAbilities = []; setStoryFlags({}); setPlayerAbilities([]); }

      if (gameplayEffects) {
        gameplayEffects.forEach(effect => {
          // Full gameplayEffects logic from original component
          switch (effect.type) {
            case "player_ability_gain": tempPlayerAbilities.push({ name: effect.abilityName, description: effect.description, uses: effect.uses }); break;
            case "story_flag_set": tempStoryFlags[effect.flagName] = effect.value; break;
            case "player_ability_update": tempPlayerAbilities = tempPlayerAbilities.map(ab => ab.name === effect.abilityName ? { ...ab, uses: effect.newUses, description: effect.description || ab.description } : ab); break;
            case "player_ability_remove": tempPlayerAbilities = tempPlayerAbilities.filter(ab => ab.name !== effect.abilityName); break;
          }
        });
        setStoryFlags(tempStoryFlags);
      }
      setPlayerAbilities(tempPlayerAbilities);

      if (isInitial) {
        setInventory(initialInventory?.slice(0, 3) || []); setIsInitialLoad(false);
        tempPlayerHealth = MAX_PLAYER_HEALTH; setPlayerHealth(MAX_PLAYER_HEALTH); 
        setCombatLog([]); setIsInCombat(false);
        if (persistentThreatDetails) {
          tempPersistentThreat = { ...persistentThreatDetails, currentHealth: persistentThreatDetails.maxHealth, status: updatedThreatStatus || 'distant', lastKnownAction: threatEncounterMessage || "Lurking..." };
          setPersistentThreat(tempPersistentThreat);
        } else { setPersistentThreat(null); }
      } else if (tempPersistentThreat) {
          let newStatus = updatedThreatStatus || tempPersistentThreat.status;
          if (combatOutcome?.isEnemyDefeated) newStatus = 'defeated';
          else if (combatOutcome?.combatContinues) newStatus = 'engaged'; 
          tempPersistentThreat = { ...tempPersistentThreat, status: newStatus, lastKnownAction: combatOutcome?.narration || threatEncounterMessage || tempPersistentThreat.lastKnownAction };
      }
      
      let newIsInCombat = isInCombat;
      let newCombatLog = combatLog;

      if (combatOutcome) {
        newIsInCombat = true; 
        tempPlayerHealth = Math.max(0, tempPlayerHealth - (combatOutcome.playerDamageTaken || 0));
        setPlayerHealth(tempPlayerHealth);
        if (tempPersistentThreat) tempPersistentThreat = { ...tempPersistentThreat, currentHealth: Math.max(0, tempPersistentThreat.currentHealth - (combatOutcome.enemyDamageTaken || 0)) };
        newCombatLog = [...newCombatLog, combatOutcome.narration];
        setCombatLog(newCombatLog);

        if (combatOutcome.isPlayerDefeated || tempPlayerHealth <= 0) {
          setIsGameOver(true); setGameOverSummaryText(gameOverSummary || "You perished.");
          handleFatalError(sceneDescription, true, true, sceneDescription); return; 
        }
        if (combatOutcome.isEnemyDefeated || (tempPersistentThreat && tempPersistentThreat.currentHealth <= 0)) {
          newIsInCombat = false;
          tempPersistentThreat = tempPersistentThreat ? { ...tempPersistentThreat, status: 'defeated', currentHealth: 0 } : null;
          setIsGameOver(true); setGameOverSummaryText(gameOverSummary || "Victory achieved.");
        } else if (!combatOutcome.combatContinues) { newIsInCombat = false; }
      } else if (tempPersistentThreat?.status === 'engaged' && !combatChoices) { newIsInCombat = true; } 
      else if (tempPersistentThreat?.status !== 'engaged') { newIsInCombat = false; }

      if (gameOverSummary && !combatOutcome && !isGameOver) { 
        setIsGameOver(true); setGameOverSummaryText(gameOverSummary);
      }

      setIsInCombat(newIsInCombat);
      setPersistentThreat(tempPersistentThreat);
      if (addItem) setInventory(prev => prev.includes(addItem) ? prev : [...prev, addItem]);
      if (removeItem) setInventory(prev => prev.filter(item => item !== removeItem));
      
      setCurrentStory({ sceneDescription, choices: isGameOver || gameOverSummary ? [] : (newIsInCombat && combatChoices ? combatChoices : choices || []),
        persistentThreat: tempPersistentThreat, threatEncounterMessage: threatEncounterMessage || null, combatLog: newCombatLog, isInCombat: newIsInCombat });
      
    } catch (err) {
      handleFatalError(`Story Interrupted: ${err instanceof Error ? err.message : "Unknown error."}`);
    } finally {
      setIsLoading(false);
    }
  }, [ isGameOver, handleFatalError, playerHealth, persistentThreat, isInCombat, combatLog, memoryLog, storyFlags, playerAbilities ]);

  const startGame = useCallback(() => {
    setIsInitialLoad(true); setInventory([]); setPlayerHealth(MAX_PLAYER_HEALTH); setIsGameOver(false); setGameOverSummaryText(null); 
    setError(null); setPersistentThreat(null); setIsInCombat(false); setCombatLog([]); setMemoryLog([]); setStoryFlags({}); 
    setPlayerAbilities([]); setIsCustomChoiceInputVisible(false); setLastUsedThemeType(null);
    setCurrentStory({ sceneDescription: "Welcome to QUARRY.", choices: ["Begin"], persistentThreat: null, threatEncounterMessage: null, combatLog: [], isInCombat: false, });
  }, []);

  const getThemesByType = (themeType: ThemeType): string[] => {
    switch (themeType) {
        case "random": return [...SCENARIO_THEMES_LIST];
        case "realism": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("REALISM:"));
        case "historical": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Historical:"));
        case "modern": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Contemporary & Mundane:") || t.startsWith("Mystery/Thriller:"));
        case "sci_fi": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Science Fiction:"));
        case "fantasy": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Fantasy:"));
        default: return [...SCENARIO_THEMES_LIST];
    }
  };

  const selectRandomTheme = (themes: string[]): string => themes[Math.floor(Math.random() * themes.length)];

  const handleStartGameWithTheme = useCallback((themeType: ThemeType) => {
    startGame(); 
    setLastUsedThemeType(themeType);
    const selectedTheme = selectRandomTheme(getThemesByType(themeType));
    processApiResponse(fetchInitialStory(selectedTheme), true);
  }, [startGame, processApiResponse]);
  
  const handleCustomScenarioSelected = useCallback((scenario: string) => {
    setIsCustomScenarioModalVisible(false); startGame(); setLastUsedThemeType(null);
    processApiResponse(fetchInitialStory(scenario), true);
  }, [startGame, processApiResponse]);

  const handleChoiceSelected = useCallback((choice: string | Choice) => {
    if (isGameOver) return;
    const choiceText = typeof choice === 'string' ? choice : choice.text;
    const isTriggeringCombat = typeof choice !== 'string' && !!choice.triggersCombat;
    if (!isInitialLoad) {
      processApiResponse(fetchNextStorySegment( currentStory.sceneDescription, choiceText, inventory, playerHealth, persistentThreat, isInCombat, isTriggeringCombat, memoryLog, storyFlags, playerAbilities ));
    }
  }, [ isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, persistentThreat, isInCombat, isGameOver, processApiResponse, memoryLog, storyFlags, playerAbilities ]);

  const handleCustomChoiceSubmit = useCallback(() => {
    if (!customChoiceText.trim() || isInitialLoad) return;
    setIsCustomChoiceInputVisible(false); 
    processApiResponse(fetchNextStorySegment( currentStory.sceneDescription, customChoiceText.trim(), inventory, playerHealth, persistentThreat, isInCombat, false, memoryLog, storyFlags, playerAbilities ));
    setCustomChoiceText(""); 
  }, [ customChoiceText, isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, persistentThreat, isInCombat, processApiResponse, memoryLog, storyFlags, playerAbilities ]);

  const handleRegenerateInitialScene = useCallback(() => {
    if (isLoading) return;
    const themeTypeToUse = lastUsedThemeType || "random";
    const selectedTheme = selectRandomTheme(getThemesByType(themeTypeToUse));
    processApiResponse(fetchInitialStory(selectedTheme), true);
  }, [processApiResponse, isLoading, lastUsedThemeType]);

  const currentDisplayedChoices = currentStory.choices;
  const isDisplayingInitialStartOptions = isInitialLoad && !isLoading && currentDisplayedChoices.length === 1 && currentDisplayedChoices[0] === "Begin";
  const showRegenerateButton = !isInitialLoad && !isLoading && !isGameOver && !isCustomChoiceInputVisible && memoryLog.length <= 1;

  const themeButtonBaseClass = "w-full font-semibold py-3 px-5 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 text-lg disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  const randomThemeButtonClass = `${themeButtonBaseClass} bg-yellow-500 text-black font-bold hover:bg-yellow-400 focus:ring-yellow-300`;
  const realismThemeButtonClass = `${themeButtonBaseClass} text-white bg-red-800 hover:bg-red-700 focus:ring-red-600`;
  const specificThemeButtonClass = `${themeButtonBaseClass} text-white bg-gray-600 hover:bg-gray-500 focus:ring-gray-400`;
  const customThemeButtonClass = `${themeButtonBaseClass} text-yellow-300 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 md:col-span-3`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 via-black to-red-800 text-white flex flex-col items-center justify-start p-4 selection:bg-red-700 selection:text-white font-sans">
      {isLoading && <LoadingIndicator message={isInitialLoad ? "Conjuring a scenario..." : "The story unfolds..."} />} 
      
      <header className="w-full max-w-3xl text-center my-6 md:my-8">
        <h1 className="text-8xl uppercase font-medium tracking-wider text-yellow-400 italic" style={{fontFamily: "'Times New Roman', serif"}}> QUARRY </h1>
      </header>

      <main className="w-full max-w-3xl flex flex-col items-center">
        {(!isInitialLoad || currentStory.sceneDescription !== "Welcome to QUARRY.") && (
            <div className="relative w-full max-w-3xl mb-8"> 
              <StoryDisplay text={currentStory.sceneDescription} />
              {showRegenerateButton && (
                  <button
                      onClick={handleRegenerateInitialScene}
                      disabled={isLoading}
                      className="absolute -top-3 -right-3 z-10 bg-sky-600 text-white font-bold p-2 rounded-full shadow-lg transition-all duration-150 ease-in-out hover:bg-sky-500 hover:shadow-xl transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border-2 border-sky-400"
                      title="Regenerate Initial Scene" aria-label="Regenerate Initial Scene"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
                      </svg>
                  </button>
              )}
            </div>
        )}

        {persistentThreat && !isGameOver && !isInitialLoad && (
          <PersistentThreatDisplay threat={persistentThreat} message={currentStory.threatEncounterMessage} isInCombat={isInCombat} />
        )}
        
        {!isGameOver && !isInitialLoad && (
          <div className="w-full max-w-lg text-center my-4">
            <div className="text-xl font-semibold text-red-300 mb-1"> Health: {playerHealth} / {MAX_PLAYER_HEALTH} </div>
            <div className="w-full bg-gray-700 rounded-full h-4 border-2 border-gray-600 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.max(0, (playerHealth / MAX_PLAYER_HEALTH) * 100)}%` }} />
            </div>
          </div>
        )}

        {!isInitialLoad && <InventoryDisplay items={inventory} />}

        {isGameOver && (
          <div className="bg-black bg-opacity-80 p-6 rounded-lg shadow-xl mb-6 max-w-3xl w-full text-center border-2 border-red-700">
            <h2 className="text-3xl font-bold text-red-500 mb-3">GAME OVER</h2>
            <p className="text-xl mb-4 whitespace-pre-line text-gray-300">{gameOverSummaryText || "The End."}</p>
            <button onClick={startGame} className={`${themeButtonBaseClass} bg-gray-700 hover:bg-gray-600 inline-block w-auto`}> Play Again </button>
          </div>
        )}
        
        <div className="w-full max-w-xl flex flex-col items-center mt-4 md:mt-6">
            {isDisplayingInitialStartOptions && (
                 <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <button onClick={() => handleStartGameWithTheme("random")} className={randomThemeButtonClass} disabled={isLoading}>Random</button>
                    <button onClick={() => handleStartGameWithTheme("realism")} className={realismThemeButtonClass} disabled={isLoading}>Realism</button>
                    <button onClick={() => handleStartGameWithTheme("historical")} className={specificThemeButtonClass} disabled={isLoading}>Historical</button>
                    <button onClick={() => handleStartGameWithTheme("modern")} className={specificThemeButtonClass} disabled={isLoading}>Modern</button>
                    <button onClick={() => handleStartGameWithTheme("sci_fi")} className={specificThemeButtonClass} disabled={isLoading}>Sci-Fi</button>
                    <button onClick={() => handleStartGameWithTheme("fantasy")} className={specificThemeButtonClass} disabled={isLoading}>Fantasy</button>
                    <button onClick={() => setIsCustomScenarioModalVisible(true)} className={customThemeButtonClass} disabled={isLoading}> CUSTOM </button>
                </div>
            )}

            {!isDisplayingInitialStartOptions && !isGameOver && !isCustomChoiceInputVisible && !isLoading && (
                <>
                    <button onClick={() => setIsCustomChoiceInputVisible(true)} disabled={isLoading}
                        className="w-full bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:bg-gray-600 hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 disabled:bg-gray-500 disabled:cursor-not-allowed border border-gray-600 mb-4"
                    > Write your own... </button>
                    {currentDisplayedChoices.length > 0 && <ChoicesDisplay choices={currentDisplayedChoices} onChoiceSelected={handleChoiceSelected} disabled={isLoading}/>}
                </>
            )}

            {!isDisplayingInitialStartOptions && isCustomChoiceInputVisible && !isGameOver && !isLoading && (
                <div className="w-full flex flex-col items-center space-y-3">
                    <textarea value={customChoiceText} onChange={(e) => setCustomChoiceText(e.target.value)} placeholder="Enter your action..." rows={3}
                        className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 transition" />
                    <div className="flex space-x-3 w-full sm:w-auto">
                        <button onClick={handleCustomChoiceSubmit} disabled={!customChoiceText.trim()} className={`${themeButtonBaseClass} flex-1 sm:flex-none`}> Submit </button>
                        <button onClick={() => setIsCustomChoiceInputVisible(false)} className={`${themeButtonBaseClass} flex-1 sm:flex-none`}> Cancel </button>
                    </div>
                </div>
            )}
        </div> 
      </main>
      
      <ScenarioSelectorModal isOpen={isCustomScenarioModalVisible} onClose={() => setIsCustomScenarioModalVisible(false)} onScenarioSelected={handleCustomScenarioSelected} scenarios={SCENARIO_THEMES_LIST} />
    </div>
  );
};

export default App;
