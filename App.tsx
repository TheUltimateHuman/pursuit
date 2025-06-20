// App.tsx (with Custom Scenario Selection Feature) 

import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import { StoryState, GeminiApiResponse, PersistentThreat, Choice as ChoiceType, CombatOutcome, GameplayEffect, PlayerAbilityEffect, StoryFlagEffect, PursuerModifierEffect, PlayerAbilityUpdateEffect, PlayerAbilityRemoveEffect } from './types'; 
import { fetchInitialStory, fetchNextStorySegment, InitialStoryData } from './services/geminiService'; 
import StoryDisplay from './components/StoryDisplay'; 
import ChoicesDisplay from './components/ChoicesDisplay'; 
import LoadingIndicator from './components/LoadingIndicator'; 
import ApiKeyMissingBanner from './components/ApiKeyMissingBanner'; 
import InventoryDisplay from './components/InventoryDisplay'; 
import PersistentThreatDisplay from './components/PersistentThreatDisplay'; 
import { MAX_PLAYER_HEALTH, SCENARIO_THEMES_LIST } from './constants'; 
import ScenarioSelectorModal from './components/ScenarioSelectorModal'; // <-- IMPORT THE NEW COMPONENT 

// --- This is the ONLY configuration needed. It uses the env.js file. --- 
import { API_KEY as API_KEY_FROM_ENV_JS } from './env.js'; 
const API_KEY_AVAILABLE = typeof API_KEY_FROM_ENV_JS === 'string' && API_KEY_FROM_ENV_JS.trim() !== ""; 
// --- End Configuration --- 

const MAX_MEMORY_LOG_ENTRIES = 5; 
type ThemeType = "random" | "realism" | "historical" | "modern" | "sci_fi" | "fantasy"; 

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
  const [playerAbilities, setPlayerAbilities] = useState<{ name: string; description: string; uses?: number }[]>([]); 

  const [isCustomChoiceInputVisible, setIsCustomChoiceInputVisible] = useState<boolean>(false); 
  const [customChoiceText, setCustomChoiceText] = useState<string>(""); 
  const [lastUsedThemeType, setLastUsedThemeType] = useState<ThemeType | null>(null); 
  
  // --- NEW STATE FOR THE CUSTOM SCENARIO MODAL --- 
  const [isCustomScenarioModalVisible, setIsCustomScenarioModalVisible] = useState<boolean>(false); 

  useEffect(() => { 
    if (!API_KEY_AVAILABLE) { 
      console.error("API_KEY is not available. Check deployment secrets and the local env.js file."); 
    } 
  }, []); 

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
      let tempPlayerAbilities = [...playerAbilities]; 
      let localIsGameOver = isGameOver; 
      let localGameOverSummaryText = gameOverSummaryText; 

      if (memoryLogSummary) { 
        tempMemoryLog = isInitial ? [memoryLogSummary] : [...tempMemoryLog, memoryLogSummary]; 
        if (tempMemoryLog.length > MAX_MEMORY_LOG_ENTRIES) { 
          tempMemoryLog = tempMemoryLog.slice(tempMemoryLog.length - MAX_MEMORY_LOG_ENTRIES); 
        } 
        setMemoryLog(tempMemoryLog); 
      } else if (isInitial) { 
        setMemoryLog([]); 
      } 

      if (isInitial) { 
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
                  let reductionFactor = 0.1; 
                  if (effect.magnitude === "moderate") reductionFactor = 0.2; 
                  else if (effect.magnitude === "major") reductionFactor = 0.3; 
                  
                  const healthReduction = Math.floor(tempPersistentThreat.maxHealth * reductionFactor); 
                  const newMaxHealth = Math.max(1, tempPersistentThreat.maxHealth - healthReduction); 
                  const newCurrentHealth = Math.min(newMaxHealth, Math.max(0, tempPersistentThreat.currentHealth - healthReduction)); 
                  tempPersistentThreat = { ...tempPersistentThreat, maxHealth: newMaxHealth, currentHealth: newCurrentHealth }; 
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
      setPlayerAbilities(tempPlayerAbilities); 

      if (isInitial) { 
        setInventory(initialInventory?.slice(0, 3) || []); 
        setIsInitialLoad(false); 
        tempPlayerHealth = MAX_PLAYER_HEALTH; 
        setPlayerHealth(MAX_PLAYER_HEALTH); 
        setCombatLog([]); 
        setIsInCombat(false); 

        if (persistentThreatDetails) { 
          const newThreat: PersistentThreat = { 
            name: persistentThreatDetails.name, 
            description: persistentThreatDetails.description, 
            maxHealth: persistentThreatDetails.maxHealth, 
            currentHealth: persistentThreatDetails.maxHealth, 
            senses: persistentThreatDetails.senses || [], 
            status: updatedThreatStatus || 'distant', 
            lastKnownAction: threatEncounterMessage || "Lurking...", 
          }; 
          tempPersistentThreat = newThreat; 
          setPersistentThreat(newThreat); 
        } else { 
            setPersistentThreat(null); 
        } 
      } else { 
        if (tempPersistentThreat && (updatedThreatStatus || threatEncounterMessage || combatOutcome || gameplayEffects?.some(e => e.type === 'pursuer_modifier'))) { 
          let newStatus = updatedThreatStatus || tempPersistentThreat.status; 
          if (combatOutcome?.isEnemyDefeated) newStatus = 'defeated'; 
          else if (combatOutcome?.combatContinues) newStatus = 'engaged'; 
          
          tempPersistentThreat = { 
            ...tempPersistentThreat, 
            status: newStatus, 
            lastKnownAction: combatOutcome?.narration || threatEncounterMessage || tempPersistentThreat.lastKnownAction, 
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
        
        if (combatOutcome.isEnemyDefeated || (tempPersistentThreat && tempPersistentThreat.currentHealth <= 0)) { 
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
        setCurrentStory(prev => ({ ...prev, sceneDescription, choices: [], isInCombat: false })); 
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
      isGameOver, handleFatalError, playerHealth, persistentThreat, isInCombat, 
      combatLog, memoryLog, storyFlags, playerAbilities, gameOverSummaryText 
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
    setLastUsedThemeType(null); 
    setCurrentStory({ 
        sceneDescription: "Welcome to QUARRY.", 
        choices: ["Begin"], 
        persistentThreat: null, 
        threatEncounterMessage: null, 
        combatLog: [], 
        isInCombat: false, 
    }); 
  }, []); 

  const getThemesByType = (themeType: ThemeType): string[] => { 
    switch (themeType) { 
        case "random": return [...SCENARIO_THEMES_LIST]; 
        case "realism": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("REALISM:")); 
        case "historical": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Historical:") || t.startsWith("Mythological & Folkloric:")); 
        case "modern": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Mystery/Thriller:") || t.startsWith("Occupational & Mundane Catastrophe:") || t.startsWith("Contemporary & Mundane:")); 
        case "sci_fi": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Science Fiction:") || t.startsWith("Cosmic & Eldritch Horror:") || t.startsWith("Unique & Surreal Environments:")); 
        case "fantasy": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Fantasy:") || t.startsWith("Psychological & Existential Horror:")); 
        default: 
            console.warn(`Unknown themeType '${themeType}'.`); 
            return [...SCENARIO_THEMES_LIST]; 
    } 
  }; 

  const selectRandomTheme = (themes: string[]): string => { 
    if (themes.length > 0) { 
      return themes[Math.floor(Math.random() * themes.length)]; 
    } 
    console.warn(`Theme list was empty.`); 
    return SCENARIO_THEMES_LIST[Math.floor(Math.random() * SCENARIO_THEMES_LIST.length)] || "Unique & Surreal Environments: Abstract Conceptual Realm Made Manifest"; 
  }; 

  const handleStartGameWithTheme = useCallback((themeType: ThemeType) => { 
    startGame(); 
    setLastUsedThemeType(themeType); 
    if (!API_KEY_AVAILABLE) { 
        setError("API Key is not configured. Please ensure it's set up in the environment."); 
        return; 
    } 
    const themesToConsider = getThemesByType(themeType); 
    const selectedTheme = selectRandomTheme(themesToConsider); 
    if (!selectedTheme) { 
        setError("Failed to select a scenario theme."); 
        return; 
    } 
    processApiResponse(fetchInitialStory(selectedTheme), true); 
  }, [startGame, processApiResponse, setLastUsedThemeType, setError]); 

  // --- NEW HANDLER FOR CUSTOM SCENARIO SELECTION --- 
  const handleCustomScenarioSelected = useCallback((scenario: string) => { 
    if (!API_KEY_AVAILABLE) { 
      setError("API Key is not configured."); 
      return; 
    } 
    setIsCustomScenarioModalVisible(false); 
    startGame(); 
    setLastUsedThemeType(null); 
    processApiResponse(fetchInitialStory(scenario), true); 
  }, [startGame, processApiResponse, setError]); 

  const handleChoiceSelected = useCallback((choice: string | ChoiceType) => { 
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

  const handleCustomChoiceSubmit = useCallback(() => { 
    if (!customChoiceText.trim() || isInitialLoad) return; 
    setIsCustomChoiceInputVisible(false); 
    processApiResponse(fetchNextStorySegment( 
      currentStory.sceneDescription, customChoiceText.trim(), inventory, playerHealth, 
      persistentThreat, isInCombat, false, memoryLog, storyFlags, playerAbilities 
    )); 
    setCustomChoiceText(""); 
  }, [ 
    customChoiceText, isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, 
    persistentThreat, isInCombat, processApiResponse, setIsCustomChoiceInputVisible, memoryLog, storyFlags, playerAbilities 
  ]); 

  const handleRegenerateInitialScene = useCallback(() => { 
    if (!API_KEY_AVAILABLE || isLoading) return; 
    const themeTypeToUse = lastUsedThemeType || "random"; 
    const themesToConsider = getThemesByType(themeTypeToUse); 
    const selectedTheme = selectRandomTheme(themesToConsider); 
    if (!selectedTheme) { 
        setError("Failed to select a scenario theme for regeneration."); 
        return; 
    } 
    processApiResponse(fetchInitialStory(selectedTheme), true); 
  }, [processApiResponse, isLoading, lastUsedThemeType, setError]); 

  if (!API_KEY_AVAILABLE) { 
    return <ApiKeyMissingBanner />; 
  } 
  
  const currentDisplayedChoices = currentStory.choices; 
  const isDisplayingInitialStartOptions = isInitialLoad && !isLoading && currentStory.choices.length === 1 && currentStory.choices[0] === "Begin"; 
  const showRegenerateButton = !isInitialLoad && !isLoading && !isGameOver && !isCustomChoiceInputVisible && memoryLog.length <= 1 && currentDisplayedChoices.length > 0; 

  const themeButtonBaseClass = "w-full font-semibold py-3 px-5 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 text-lg disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"; 
  const randomThemeButtonClass = `${themeButtonBaseClass} bg-yellow-500 text-black font-bold hover:bg-yellow-400 focus:ring-yellow-300`; 
  const realismThemeButtonClass = `${themeButtonBaseClass} text-white bg-red-800 hover:bg-red-700 focus:ring-red-600 disabled:bg-red-900 disabled:text-gray-300`; 
  const specificThemeButtonClass = `${themeButtonBaseClass} text-white bg-gray-600 hover:bg-gray-500 focus:ring-gray-400 disabled:bg-gray-400`; 
  const customThemeButtonClass = `${themeButtonBaseClass} text-yellow-300 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 disabled:bg-gray-800 md:col-span-3`; 


  return ( 
    <div className="min-h-screen bg-gradient-to-br from-red-800 via-black to-red-800 text-white flex flex-col items-center justify-center p-4 selection:bg-red-700 selection:text-white"> 
      {isLoading && <LoadingIndicator message={isInitialLoad && !currentStory.sceneDescription.startsWith("Welcome") ? "Loading..." : "Processing..."} />} 
      
      <header className="w-full max-w-3xl text-center mb-6 md:mb-8"> 
        <h1 className="text-8xl uppercase font-medium tracking-wider text-yellow-400 italic"> 
          QUARRY 
        </h1> 
      </header> 

      <main className="w-full max-w-3xl flex flex-col items-center"> 
        
        {(!isInitialLoad || currentStory.sceneDescription !== "Welcome to QUARRY.") && ( 
            <div className="relative w-full max-w-3xl mb-8">
                <StoryDisplay text={currentStory.sceneDescription} />
                {showRegenerateButton && (
                    <button
                        onClick={handleRegenerateInitialScene}
                        disabled={isLoading}
                        className="absolute top-2 right-2 bg-sky-700 text-white font-semibold p-1 rounded-full shadow-md transition-all duration-150 ease-in-out hover:bg-sky-600 hover:shadow-lg transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-lg border border-sky-600"
                        title="Regenerate Initial Scene (same category)"
                        aria-label="Regenerate Initial Scene (same category)"
                    >
                        🔄
                    </button>
                )}
            </div>
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

        {isGameOver && persistentThreat?.status === 'defeated' && ( 
           <div className="w-full max-w-3xl flex flex-col items-center my-6"> 
            <p className="text-4xl font-bold text-green-400 my-4 tracking-wider uppercase" 
               aria-live="polite"> 
                SUCCESS 
            </p> 
            <button 
              onClick={startGame} 
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out hover:bg-gray-500 hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 text-lg" 
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
        
        <div className="w-full max-w-xl flex flex-col items-center mt-4 md:mt-6"> 

            {isDisplayingInitialStartOptions && ( 
                 <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"> 
                    <button 
                        key="random" 
                        onClick={() => handleStartGameWithTheme("random")} 
                        className={randomThemeButtonClass} 
                        disabled={isLoading} 
                    > 
                        Random 
                    </button> 
                    <button key="realism" onClick={() => handleStartGameWithTheme("realism")} className={realismThemeButtonClass} disabled={isLoading}>Realism</button> 
                    <button key="historical" onClick={() => handleStartGameWithTheme("historical")} className={specificThemeButtonClass} disabled={isLoading}>Historical</button> 
                    <button key="modern" onClick={() => handleStartGameWithTheme("modern")} className={specificThemeButtonClass} disabled={isLoading}>Modern</button> 
                    <button key="scifi" onClick={() => handleStartGameWithTheme("sci_fi")} className={specificThemeButtonClass} disabled={isLoading}>Sci-Fi</button> 
                    <button key="fantasy" onClick={() => handleStartGameWithTheme("fantasy")} className={specificThemeButtonClass} disabled={isLoading}>Fantasy</button> 
                    <button 
                      key="custom" 
                      onClick={() => setIsCustomScenarioModalVisible(true)} 
                      className={customThemeButtonClass} 
                      disabled={isLoading} 
                    > 
                      CUSTOM 
                    </button> 
                </div> 
            )} 

            {!isDisplayingInitialStartOptions && isCustomChoiceInputVisible && !isGameOver && !isLoading && ( 
                <div className="w-full flex flex-col items-center space-y-3"> 
                    <textarea 
                        value={customChoiceText} 
                        onChange={(e) => setCustomChoiceText(e.target.value)} 
                        placeholder="Enter your action..." 
                        rows={3} 
                        className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150" 
                        disabled={isLoading} 
                        aria-label="Custom action input" 
                    /> 
                    <div className="flex space-x-3 w-full sm:w-auto"> 
                        <button 
                            onClick={handleCustomChoiceSubmit} 
                            disabled={isLoading || !customChoiceText.trim()} 
                            className="flex-1 sm:flex-none bg-gray-600 text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed" 
                        > 
                            Submit 
                        </button> 
                        <button 
                            onClick={() => setIsCustomChoiceInputVisible(false)} 
                            disabled={isLoading} 
                            className="flex-1 sm:flex-none bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed" 
                        > 
                            Cancel 
                        </button> 
                    </div> 
                </div> 
            )} 

            {!isDisplayingInitialStartOptions && !isGameOver && !isCustomChoiceInputVisible && !isLoading && ( 
                <> 
                    <button 
                        onClick={() => { 
                            setIsCustomChoiceInputVisible(true); 
                            setCustomChoiceText(""); 
                        }} 
                        disabled={isLoading} 
                        className="w-full bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md 
                                     transition-all duration-150 ease-in-out 
                                     hover:bg-gray-600 hover:shadow-lg transform hover:scale-105 
                                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 
                                     disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none 
                                     border border-gray-600 mb-4" // Added mb-4 for spacing 
                    > 
                        Write your own... 
                    </button> 

                    {currentDisplayedChoices.length > 0 && ( 
                        <ChoicesDisplay 
                            choices={currentDisplayedChoices} 
                            onChoiceSelected={handleChoiceSelected} 
                            disabled={isLoading} 
                        /> 
                    )} 
                </> 
            )} 
            
            {!isDisplayingInitialStartOptions && !isLoading && !error && !isGameOver && currentDisplayedChoices.length === 0 && !isCustomChoiceInputVisible && ( 
                 <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700 w-full"> 
                     <p className="text-xl text-gray-400">No clear path...</p> 
                     <button 
                         onClick={startGame} 
                         className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 border border-gray-500" 
                     > 
                         Restart? 
                     </button> 
                 </div> 
             )} 
        </div> 
      </main> 
      
      <ScenarioSelectorModal 
        isOpen={isCustomScenarioModalVisible} 
        onClose={() => setIsCustomScenarioModalVisible(false)} 
        onScenarioSelected={handleCustomScenarioSelected} 
        scenarios={SCENARIO_THEMES_LIST} 
      /> 

    </div> 
  ); 
 }; 

 export default App;