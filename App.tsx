import React, { useState, useEffect, useCallback } from 'react';
import { StoryState, GeminiApiResponse, PersistentThreat, Choice as ChoiceType, CombatOutcome, GameplayEffect, PlayerAbilityEffect, StoryFlagEffect, PursuerModifierEffect, PlayerAbilityUpdateEffect, PlayerAbilityRemoveEffect } from './types';
import { fetchInitialStory, fetchNextStorySegment, InitialStoryData } from './services/geminiService';
import StoryDisplay from './components/StoryDisplay';
import ChoicesDisplay from './components/ChoicesDisplay';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyMissingBanner from './components/ApiKeyMissingBanner';
import InventoryDisplay from './components/InventoryDisplay';
import PersistentThreatDisplay from './components/PersistentThreatDisplay';
import { MAX_PLAYER_HEALTH, SCENARIO_THEMES_LIST } from './constants';
import { API_KEY } from './env.js'; // Import the key from our new file

const API_KEY_AVAILABLE = typeof API_KEY === 'string' && API_KEY.trim() !== "";

const MAX_MEMORY_LOG_ENTRIES = 5;


const App: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<StoryState>({
    sceneDescription: "Welcome to PURSUIT.",
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
  const [playerAbilities, setPlayerAbilities] = useState<{ name: string; description: string; uses?: number }[]>([]);


  const [isCustomChoiceInputVisible, setIsCustomChoiceInputVisible] = useState<boolean>(false);
  const [customChoiceText, setCustomChoiceText] = useState<string>("");

  useEffect(() => {
    // Diagnostic log for the build process
    console.log("DEBUG: API_KEY as seen by app:", API_KEY ? `Exists (length: ${API_KEY.length})` : 'Does not exist or is not a string');
    console.log("DEBUG: API_KEY_AVAILABLE evaluates to:", API_KEY_AVAILABLE);

    if (!API_KEY_AVAILABLE) {
      console.error("API_KEY is not available. Check the build process and the generated env.js file.");
    }
  }, []); // Runs once on mount


  const handleFatalError = useCallback((message: string, gameOver: boolean = true, isNarrativeDefeat: boolean = false, narrativeDemiseScene?: string) => {
    setIsLoading(false);
    if (gameOver) {
      setIsGameOver(true);
    }
    setIsInCombat(false); 
    setIsCustomChoiceInputVisible(false);

    if (isNarrativeDefeat && gameOver) { 
      setError(null); 
      setCurrentStory(prev => ({
        ...prev,
        sceneDescription: narrativeDemiseScene || prev.sceneDescription,
        choices: [],
        isInCombat: false,
      }));
    } else { 
      setError(message);
      setCurrentStory(prev => ({
        ...prev,
        choices: gameOver ? [] : prev.choices,
        isInCombat: false,
      }));
    }
  }, [setCurrentStory, setError, setIsLoading, setIsGameOver, setIsInCombat, setIsCustomChoiceInputVisible]);


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
      const { 
        sceneDescription, 
        choices, 
        addItem, 
        removeItem, 
        persistentThreatDetails,
        updatedThreatStatus,
        threatEncounterMessage,
        initialInventory, 
        combatOutcome,
        combatChoices,
        memoryLogSummary,
        gameplayEffects,
        gameOverSummary
      } = apiResponse;
      
      if (!sceneDescription || (!choices && !combatChoices && !isGameOver && !(combatOutcome && (combatOutcome.isPlayerDefeated || combatOutcome.isEnemyDefeated)) && !gameOverSummary)) {
        throw new Error("AI response incomplete. Missing essential data.");
      }

      
      let tempPlayerHealth = playerHealth; 
      let tempPersistentThreat = persistentThreat;
      let tempMemoryLog = memoryLog;
      let tempStoryFlags = storyFlags;
      let tempPlayerAbilities = [...playerAbilities]; // Create a new array to modify
      let localIsGameOver = isGameOver;
      let localGameOverSummaryText = gameOverSummaryText;


      if (memoryLogSummary) {
        tempMemoryLog = isInitial ? [memoryLogSummary] : [...tempMemoryLog, memoryLogSummary]; // Reset log if initial
        if (tempMemoryLog.length > MAX_MEMORY_LOG_ENTRIES) {
          tempMemoryLog = tempMemoryLog.slice(tempMemoryLog.length - MAX_MEMORY_LOG_ENTRIES);
        }
        setMemoryLog(tempMemoryLog);
      } else if (isInitial) {
        setMemoryLog([]); // Clear memory log if initial and no summary provided
      }


      if (isInitial) { // Reset these states fully for an initial load or regenerate
        setStoryFlags({});
        setPlayerAbilities([]);
        tempStoryFlags = {};
        tempPlayerAbilities = [];
      }


      if (gameplayEffects && gameplayEffects.length > 0) {
        gameplayEffects.forEach(effect => {
          switch (effect.type) {
            case "player_ability_gain":
              if (!tempPlayerAbilities.find(ab => ab.name === effect.abilityName)) {
                tempPlayerAbilities.push({ name: effect.abilityName, description: effect.description, uses: effect.uses });
              } else {
                 tempPlayerAbilities = tempPlayerAbilities.map(ab => 
                    ab.name === effect.abilityName ? { ...ab, description: effect.description, uses: effect.uses ?? ab.uses } : ab
                 );
              }
              break;
            case "story_flag_set":
              tempStoryFlags = { ...tempStoryFlags, [effect.flagName]: effect.value };
              break;
            case "pursuer_modifier":
              if (tempPersistentThreat) {
                if (effect.modifierType === "weaken_permanently") {
                  let reductionFactor = 0;
                  if (effect.magnitude === "minor") reductionFactor = 0.1;
                  else if (effect.magnitude === "moderate") reductionFactor = 0.2;
                  else if (effect.magnitude === "major") reductionFactor = 0.3;
                  
                  if (reductionFactor > 0) {
                    const healthReduction = Math.floor(tempPersistentThreat.maxHealth * reductionFactor);
                    const newMaxHealth = Math.max(1, tempPersistentThreat.maxHealth - healthReduction); 
                    const newCurrentHealth = Math.min(newMaxHealth, Math.max(0, tempPersistentThreat.currentHealth - healthReduction));
                    tempPersistentThreat = { ...tempPersistentThreat, maxHealth: newMaxHealth, currentHealth: newCurrentHealth };
                  }
                }
              }
              break;
            case "player_ability_update":
              tempPlayerAbilities = tempPlayerAbilities.map(ab =>
                ab.name === (effect as PlayerAbilityUpdateEffect).abilityName
                  ? { ...ab, uses: (effect as PlayerAbilityUpdateEffect).newUses, description: (effect as PlayerAbilityUpdateEffect).description || ab.description }
                  : ab
              );
              break;
            case "player_ability_remove":
              tempPlayerAbilities = tempPlayerAbilities.filter(
                ab => ab.name !== (effect as PlayerAbilityRemoveEffect).abilityName
              );
              break;
          }
        });
        setStoryFlags(tempStoryFlags);
      }
      // Set player abilities after processing all effects
      setPlayerAbilities(tempPlayerAbilities);


      if (isInitial) {
        setInventory(initialInventory?.slice(0, 3) || []); 
        setIsInitialLoad(false);
        tempPlayerHealth = MAX_PLAYER_HEALTH; 
        setPlayerHealth(MAX_PLAYER_HEALTH); 
        setCombatLog([]); 
        setIsInCombat(false);
        // memoryLog, storyFlags, playerAbilities already handled above for isInitial

        if (persistentThreatDetails) {
          const newThreat: PersistentThreat = {
            name: persistentThreatDetails.name,
            description: persistentThreatDetails.description,
            maxHealth: persistentThreatDetails.maxHealth,
            currentHealth: persistentThreatDetails.maxHealth,
            senses: persistentThreatDetails.senses || [], // Initialize senses
            status: updatedThreatStatus || 'distant',
            lastKnownAction: threatEncounterMessage || "Lurking...",
          };
          tempPersistentThreat = newThreat;
          setPersistentThreat(newThreat);
          
        } else {
            setPersistentThreat(null); // Ensure threat is cleared if not provided
        }
      } else { 
         if (tempPersistentThreat && (updatedThreatStatus || threatEncounterMessage || combatOutcome || gameplayEffects?.some(e => e.type === 'pursuer_modifier'))) {
            let newStatus = updatedThreatStatus || tempPersistentThreat.status;
            if (combatOutcome && combatOutcome.isEnemyDefeated) newStatus = 'defeated';
            else if (combatOutcome && combatOutcome.combatContinues) newStatus = 'engaged'; 
            
            tempPersistentThreat = {
              ...tempPersistentThreat, 
              status: newStatus,
              lastKnownAction: combatOutcome?.narration || threatEncounterMessage || tempPersistentThreat.lastKnownAction,
              // Senses are set at creation and don't typically change mid-game unless a specific effect modifies them
            };
          }
      }
      
      let newIsInCombat = isInCombat;
      let newCombatLog = combatLog;

      if (combatOutcome) {
        newIsInCombat = true; 
        const playerDamage = combatOutcome.playerDamageTaken || 0;
        const enemyDamage = combatOutcome.enemyDamageTaken || 0;
        const playerHeal = combatOutcome.playerHealingReceived || 0;
        
        let newPlayerHealthThisTurn = tempPlayerHealth;
        if (playerHeal > 0) {
          newPlayerHealthThisTurn = Math.min(MAX_PLAYER_HEALTH, newPlayerHealthThisTurn + playerHeal);
        }
        newPlayerHealthThisTurn -= playerDamage;
        tempPlayerHealth = Math.max(0, newPlayerHealthThisTurn);
        setPlayerHealth(tempPlayerHealth);

        if (tempPersistentThreat) {
          const newEnemyHealthAfterDamage = tempPersistentThreat.currentHealth - enemyDamage;
          tempPersistentThreat = { ...tempPersistentThreat, currentHealth: Math.max(0, newEnemyHealthAfterDamage) };
        }
        
        newCombatLog = [...newCombatLog, combatOutcome.narration];
        setCombatLog(newCombatLog);

        if (combatOutcome.isPlayerDefeated || tempPlayerHealth <= 0) {
          localIsGameOver = true;
          setIsGameOver(true);
          localGameOverSummaryText = gameOverSummary || "You perished.";
          setGameOverSummaryText(localGameOverSummaryText);
          handleFatalError(sceneDescription, true, true, sceneDescription); 
          return; 
        }
        
        const enemyHealthAfterThisTurnDamage = tempPersistentThreat ? tempPersistentThreat.currentHealth : 0;
        if (combatOutcome.isEnemyDefeated || (tempPersistentThreat && enemyHealthAfterThisTurnDamage <= 0)) {
          newCombatLog = [...newCombatLog, `${tempPersistentThreat?.name || 'The pursuer'} has been defeated!`];
          setCombatLog(newCombatLog);
          newIsInCombat = false;
          tempPersistentThreat = tempPersistentThreat ? { ...tempPersistentThreat, status: 'defeated', currentHealth: 0 } : null;
          localIsGameOver = true; 
          setIsGameOver(true);
          localGameOverSummaryText = gameOverSummary || "Victory achieved.";
          setGameOverSummaryText(localGameOverSummaryText);
        } else if (!combatOutcome.combatContinues) {
          newIsInCombat = false; 
        }
      } else if (tempPersistentThreat?.status === 'engaged' && !combatChoices) {
        newIsInCombat = true; 
      } else if (tempPersistentThreat?.status !== 'engaged') {
         newIsInCombat = false; 
      }

      if (gameOverSummary && !combatOutcome && !localIsGameOver) { 
        localIsGameOver = true;
        setIsGameOver(true);
        localGameOverSummaryText = gameOverSummary;
        setGameOverSummaryText(localGameOverSummaryText);
        setCurrentStory(prev => ({
            ...prev,
            sceneDescription: sceneDescription,
            choices: [],
            isInCombat: false,
        }));
      }

      setIsInCombat(newIsInCombat);
      setPersistentThreat(tempPersistentThreat);


      if (addItem) {
        setInventory(prevInventory => prevInventory.includes(addItem) ? prevInventory : [...prevInventory, addItem]);
      }
      if (removeItem) {
        setInventory(prevInventory => prevInventory.filter(item => item !== removeItem));
      }
      
      const newChoicesToDisplay = newIsInCombat && combatChoices ? combatChoices : choices;

      setCurrentStory({
        sceneDescription, 
        choices: localIsGameOver ? [] : (newChoicesToDisplay || []),
        
        persistentThreat: tempPersistentThreat,
        threatEncounterMessage: threatEncounterMessage || null,
        combatLog: newCombatLog,
        isInCombat: newIsInCombat,
      });
      
    } catch (err) {
      console.error("Error processing AI response:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      handleFatalError(`Story Interrupted: ${errorMessage}`);
      
    } finally {
      setIsLoading(false);
    }
  }, [
      isGameOver, // Read-only state for conditional reset
      handleFatalError, 
      // Functions to set state, not values that change often themselves
      setInventory, setCurrentStory, setIsLoading, setError, setIsInitialLoad, 
      setPersistentThreat, setIsInCombat, setCombatLog, setMemoryLog, 
      setStoryFlags, setPlayerAbilities, setIsCustomChoiceInputVisible, 
      setGameOverSummaryText, setPlayerHealth,
      // Values that might be part of dependency if not reset correctly inside, but they are.
      playerHealth, persistentThreat, isInCombat, combatLog, memoryLog, storyFlags, playerAbilities, gameOverSummaryText
    ]);


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
    setCurrentStory({
        sceneDescription: "Welcome to PURSUIT.",
        choices: ["Begin"],
        
        persistentThreat: null,
        threatEncounterMessage: null,
        combatLog: [],
        isInCombat: false,
    });
  }, [setIsCustomChoiceInputVisible, setMemoryLog, setStoryFlags, setPlayerAbilities, setGameOverSummaryText]);

  const handleChoiceSelected = useCallback((choice: string | ChoiceType) => {
    if (isGameOver && (typeof choice === 'string' && choice !== "Begin")) return;

    const choiceText = typeof choice === 'string' ? choice : choice.text;
    const isTriggeringCombat = typeof choice !== 'string' && !!choice.triggersCombat;

    if (choiceText === "Begin") { 
       startGame(); 
       if (API_KEY_AVAILABLE) {
            const randomIndex = Math.floor(Math.random() * SCENARIO_THEMES_LIST.length);
            const randomTheme = SCENARIO_THEMES_LIST[randomIndex] || "Unique & Surreal Environments: Abstract Conceptual Realm Made Manifest"; // Fallback
            processApiResponse(fetchInitialStory(randomTheme), true);
       }
    } else if (!isInitialLoad) {
      processApiResponse(fetchNextStorySegment(
        currentStory.sceneDescription,
        choiceText,
        inventory,
        playerHealth,
        persistentThreat,
        isInCombat, 
        isTriggeringCombat,
        memoryLog,
        storyFlags, 
        playerAbilities 
      ));
    }
  }, [
      isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, persistentThreat, 
      isInCombat, isGameOver, startGame, processApiResponse, memoryLog, storyFlags, playerAbilities 
    ]);

  const handleCustomChoiceSubmit = useCallback(() => {
    if (!customChoiceText.trim() || isInitialLoad) return;
    setIsCustomChoiceInputVisible(false); 
    processApiResponse(fetchNextStorySegment(
      currentStory.sceneDescription,
      customChoiceText.trim(),
      inventory,
      playerHealth,
      persistentThreat,
      isInCombat,
      false, 
      memoryLog,
      storyFlags, 
      playerAbilities 
    ));
    setCustomChoiceText(""); 
  }, [
    customChoiceText, isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, 
    persistentThreat, isInCombat, processApiResponse, setIsCustomChoiceInputVisible, memoryLog, storyFlags, playerAbilities 
  ]);

  const handleRegenerateInitialScene = useCallback(() => {
    if (!API_KEY_AVAILABLE || isLoading) return;
    const randomIndex = Math.floor(Math.random() * SCENARIO_THEMES_LIST.length);
    const randomTheme = SCENARIO_THEMES_LIST[randomIndex] || "Unique & Surreal Environments: Abstract Conceptual Realm Made Manifest"; // Fallback
    processApiResponse(fetchInitialStory(randomTheme), true);
  }, [processApiResponse, isLoading]);


  if (!API_KEY_AVAILABLE) {
    return <ApiKeyMissingBanner />;
  }
  
  const currentDisplayedChoices = currentStory.choices;

  const isInitialButton = isInitialLoad && currentDisplayedChoices.length === 1 && typeof currentDisplayedChoices[0] === 'string' && currentDisplayedChoices[0] === "Begin";
  
  const showRegenerateButton = !isInitialLoad && !isLoading && !isGameOver && !isCustomChoiceInputVisible && memoryLog.length <= 1 && currentDisplayedChoices.length > 0;


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 via-black to-red-800 text-white flex flex-col items-center justify-center p-4 selection:bg-red-700 selection:text-white">
      {isLoading && <LoadingIndicator message={isInitialLoad ? "Loading..." : "Processing..."} />} 
      
      <header className="w-full max-w-3xl text-center mb-6 md:mb-8">
        <h1 className="text-5xl uppercase font-medium tracking-wider text-yellow-400">
          PURSUIT
        </h1>
      </header>

      <main className="w-full max-w-3xl flex flex-col items-center">
        
        {(!isInitialLoad || currentStory.sceneDescription !== "Welcome to PURSUIT.") && ( 
            <StoryDisplay text={currentStory.sceneDescription} />
        )}

        {currentStory.persistentThreat && !isGameOver && !isInitialLoad && (
          <PersistentThreatDisplay 
            threat={currentStory.persistentThreat} 
            message={currentStory.threatEncounterMessage}
            isInCombat={currentStory.isInCombat} 
          />
        )}
        
        {!isGameOver && !isInitialLoad && (
          <div className="w-full max-w-lg text-center my-4">
            <div className="text-xl font-semibold text-red-300 mb-1">
              Health: {playerHealth} / {MAX_PLAYER_HEALTH}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 border-2 border-gray-600 overflow-hidden shadow-md">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, (playerHealth / MAX_PLAYER_HEALTH) * 100)}%` }}
                aria-valuenow={playerHealth}
                aria-valuemin={0}
                aria-valuemax={MAX_PLAYER_HEALTH}
              ></div>
            </div>
          </div>
        )}

        {!isInitialLoad && <InventoryDisplay items={inventory} />}

        {!isInitialLoad && playerAbilities.length > 0 && !isGameOver && (
            <div className="bg-purple-800 bg-opacity-60 backdrop-blur-md p-4 rounded-lg shadow-xl mb-6 max-w-3xl w-full">
                <h3 className="text-lg font-semibold text-purple-200 mb-2 border-b border-purple-300 pb-1">Abilities:</h3>
                <ul className="list-none text-gray-200 flex flex-col space-y-1 custom-scroll max-h-24 overflow-y-auto pr-2">
                    {playerAbilities.map((ability, index) => (
                        <li key={index} className="text-sm py-0.5 hover:text-purple-100 transition-colors duration-150" title={ability.description}>
                            <span className="text-purple-300 mr-1.5">&#✦</span> {ability.name} {ability.uses !== undefined ? `(${ability.uses} use${ability.uses === 1 ? '' : 's'} left)` : ''}
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {currentStory.isInCombat && currentStory.combatLog.length > 0 && !isGameOver && (
          <div className="bg-gray-800 bg-opacity-75 p-3 rounded-lg shadow-md mb-4 max-w-3xl w-full max-h-40 overflow-y-auto custom-scroll">
            <h4 className="text-md font-semibold text-red-400 mb-1">Combat Log:</h4>
            {currentStory.combatLog.map((logEntry, index) => (
              <p key={index} className="text-sm text-gray-200 py-0.5 whitespace-pre-line">&raquo; {logEntry}</p>
            ))}
          </div>
        )}


        {/* Game Over UI for defeat or other non-victory ends */}
        {isGameOver && persistentThreat?.status !== 'defeated' && (
          <div className="bg-black bg-opacity-80 p-6 rounded-lg shadow-xl mb-6 max-w-3xl w-full text-center border-2 border-red-700">
            <h2 className="text-3xl font-bold text-red-500 mb-3">GAME OVER</h2>
            <p className="text-xl mb-4 whitespace-pre-line text-gray-300">
              {error || gameOverSummaryText || "The End."}
            </p>
            <button 
              onClick={startGame}
              className="mt-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 text-lg border border-gray-500"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Standalone Play Again button for VICTORY condition */}
        {isGameOver && persistentThreat?.status === 'defeated' && (
           <div className="w-full max-w-3xl flex flex-col items-center my-6">
            <button 
              onClick={startGame}
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md 
                        transition-all duration-150 ease-in-out 
                        hover:bg-gray-500 hover:shadow-lg transform hover:scale-105 
                        focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 
                        text-lg"
            >
              Play Again
            </button>
          </div>
        )}


        {error && !isGameOver && ( 
          <div className="bg-red-800 bg-opacity-90 p-4 rounded-lg shadow-md mb-6 max-w-3xl w-full text-center">
            <p className="font-semibold text-yellow-300">Error:</p>
            <p className="text-gray-200">{error}</p>
            <button 
              onClick={startGame} 
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 border border-gray-500" 
            >
              Restart
            </button>
          </div>
        )}
        
        <div className="w-full max-w-3xl flex flex-col items-center">
          {isInitialButton && !isLoading && (
            <button
              onClick={() => handleChoiceSelected("Begin")} 
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md 
                        transition-all duration-150 ease-in-out 
                        hover:bg-gray-500 hover:shadow-lg transform hover:scale-105 
                        focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 
                        text-lg my-4"
            >
              Begin
            </button>
          )}

          {!isInitialButton && !isGameOver && !isCustomChoiceInputVisible && currentDisplayedChoices.length > 0 && !isLoading && (
             <div className="w-full flex flex-col sm:flex-row items-center justify-center sm:space-x-3 space-y-3 sm:space-y-0">
                <ChoicesDisplay 
                  choices={currentDisplayedChoices} 
                  onChoiceSelected={handleChoiceSelected}
                  disabled={isLoading}
                />
             </div>
          )}
        </div>
        
        {!isInitialButton && !isGameOver && !isCustomChoiceInputVisible && !isLoading && (
           <div className="flex items-center mt-6 space-x-3">
            <button
                onClick={() => {
                setIsCustomChoiceInputVisible(true);
                setCustomChoiceText(""); 
                }}
                disabled={isLoading}
                className="bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md 
                            transition-all duration-150 ease-in-out 
                            hover:bg-gray-600 hover:shadow-lg transform hover:scale-105 
                            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 
                            disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                            border border-gray-600"
            >
                Custom...
            </button>
            {showRegenerateButton && (
                <button
                    onClick={handleRegenerateInitialScene}
                    disabled={isLoading}
                    className="bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md 
                                transition-all duration-150 ease-in-out 
                                hover:bg-sky-600 hover:shadow-lg transform hover:scale-105 
                                focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 
                                disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                                text-xl border border-sky-600"
                    title="Regenerate Initial Scene"
                    aria-label="Regenerate Initial Scene"
                >
                    🔄
                </button>
            )}
            </div>
        )}


        {isCustomChoiceInputVisible && !isGameOver && !isLoading && (
          <div className="w-full max-w-3xl flex flex-col items-center mt-4 space-y-3">
            <textarea
              value={customChoiceText}
              onChange={(e) => setCustomChoiceText(e.target.value)}
              placeholder="Enter your action..." 
              rows={3}
              className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150"
              disabled={isLoading}
            />
            <div className="flex space-x-3 w-full sm:w-auto">
              <button
                onClick={handleCustomChoiceSubmit}
                disabled={isLoading || !customChoiceText.trim()}
                className="flex-1 sm:flex-none bg-gray-600 text-white font-semibold py-3 px-5 rounded-lg shadow-md 
                           hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 
                           disabled:bg-gray-400 disabled:cursor-not-allowed" 
              >
                Submit
              </button>
              <button
                onClick={() => setIsCustomChoiceInputVisible(false)}
                disabled={isLoading}
                className="flex-1 sm:flex-none bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md 
                           hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 
                           disabled:bg-gray-500 disabled:cursor-not-allowed" 
              >
                Cancel
              </button>
            </div>
          </div>
        )}

         {!isLoading && !error && !isGameOver && currentDisplayedChoices.length === 0 && !isInitialLoad && !isCustomChoiceInputVisible && (
           <div className="text-center mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
             <p className="text-xl text-gray-400">No clear path...</p> 
             <button 
               onClick={startGame}
               className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 border border-gray-500" 
             >
               Restart?
             </button>
           </div>
         )}
      </main>

      <footer className="w-full max-w-3xl text-center mt-8 md:mt-12 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} PURSUIT.</p> 
      </footer>
    </div>
  );
};

export default App;