/// <reference types="vite/client" />
// App.tsx (with Custom Scenario Selection Feature) 

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; 
import { StoryState, GeminiApiResponse, PersistentThreat, Choice as ChoiceType, CombatOutcome, GameplayEffect, PlayerAbilityEffect, StoryFlagEffect, PursuerModifierEffect, PlayerAbilityUpdateEffect, PlayerAbilityRemoveEffect, InventoryItem, addToInventory, removeFromInventory, parseInventoryItem } from './types'; 
import { fetchInitialStory, fetchNextStorySegment, InitialStoryData } from './services/geminiService'; 
import { gameLogService } from './services/gameLogService';
import StoryDisplay from './components/StoryDisplay'; 
import ChoicesDisplay from './components/ChoicesDisplay'; 
import LoadingIndicator from './components/LoadingIndicator'; 
import ApiKeyMissingBanner from './components/ApiKeyMissingBanner'; 
import InventoryDisplay from './components/InventoryDisplay'; 
import PersistentThreatDisplay from './components/PersistentThreatDisplay'; 
import GameLogModal from './components/GameLogModal';
import { SCENARIO_THEMES_LIST } from './constants'; 
import ScenarioSelectorModal from './components/ScenarioSelectorModal'; // <-- IMPORT THE NEW COMPONENT

// --- This is the ONLY configuration needed. It uses the env.js file. --- 
import { API_KEY as API_KEY_FROM_ENV_JS } from './env.js'; 
const API_KEY_AVAILABLE = typeof API_KEY_FROM_ENV_JS === 'string' && API_KEY_FROM_ENV_JS.trim() !== ""; 
// --- End Configuration --- 

const MAX_MEMORY_LOG_ENTRIES = 15; 
type ThemeType = "random" | "realism" | "historical" | "modern" | "sci_fi" | "fantasy" | "mythological"; 

// --- GLYPH SETS BY GENRE ---
const GLYPH_SETS = {
  // Common glyphs used across all genres (basic dots and simple shapes)
  common: [
    ...Array(160).fill('.'),
    ...Array(200).fill('·'),
    ...Array(100).fill('•'),
    ...Array(100).fill('∙'),
    ...Array(100).fill('°'),
    ...Array(100).fill('⋅'),
    ...Array(100).fill("'"),
  ],

  // Science Fiction glyphs (technological, mathematical, and scientific symbols)
  scifi: [
    '∆', 'λ', 'µ', 'π', '⚛', '⌬', '⌭', '⌮', '⌯', '⌰', '⌱', '⌲', '⌳',
    '⌴', '⌵', '⌶', '⌷', '⌸', '⌹', '⌺', '⌻', '⌼', '⌽', '⌾', '⌿',
    '∰', '∮', '∇', '⧉', '⧠', '⧬', '⧵', '⧶', '⧷', '⩚', '⩛',
    '⟠', '⟡', '⟢', '⟣', '⟦', '⟧', '⟬', '⟭', '⟮', '⟯',
    '∅', '∃', '∄', '∈', '∉', '∊', '∋', '∌', '∍', '∎', '∏',
    '∐', '∑', '∓', '∔', '∕', '∖', '∗', '∘', '√', '∛', '∜',
    '∝', '∞', '∟', '∠', '∡', '∢', '∣', '∤', '∥', '∦', '∧',
    '∨', '∩', '∪', '∫', '∬', '∭'
  ],

  // Fantasy glyphs (mystical symbols, runes, and magical signs)
  fantasy: [
    '†', '‡', '§', '¤', '☠', '☢', '☣', '⚠', '⛧', '⟁',
    '✠', '✡', '✢', '✣', '✤', '✥', '✦', '✧', '✩', '✪',
    '✫', '✬', '✭', '✮', '✯', '✰', '✱', '✲', '✳', '✴',
    '✵', '✶', '✷', '✸', '✹', '✺', '✻', '✼', '✽', '✾',
    '✿', '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊',
    '❋', '◈', '◉', '◊', '◌', '◍', '◎', '●', '◐', '◑',
    '◒', '◓', '◔', '◕'
  ],

  // Historical glyphs (ancient symbols, hieroglyphs, and traditional marks)
  historical: [
    '☥', '☦', '☧', '☨', '☩', '☫', '☬', '☭', '☮', '☯',
    '☸', '☽', '☾', '☿', '♁', '♆', '♇', '♔', '♕', '♖',
    '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟', '♤',
    '♧', '♢', '♣', '♠', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'
  ],

  // Mythological glyphs (divine symbols, celestial marks)
  mythological: [
    '⚇', '⚈', '⚉', '⚚', '⚜', '⚝', '⚞', '⚟', '⚢', '⚣',
    '⚤', '⚥', '⚦', '⚧', '⚨', '⚩', '⚬', '⚭', '⚮', '⚯',
    '⚰', '⚱', '⚲', '⚳', '⚶', '⚷', '⚸', '⚹', '⚺', '⚻',
    '⚼', '⛤', '⛧', '⛩'
  ]
};

function getRandomGlyphForGenre(genre: string | undefined | null): string {
  // If no genre is specified, use all glyphs (common + all genres)
  if (!genre) {
    const allGlyphs = [
      ...GLYPH_SETS.common,
      ...GLYPH_SETS.scifi,
      ...GLYPH_SETS.fantasy,
      ...GLYPH_SETS.historical,
      ...GLYPH_SETS.mythological,
    ];
    return allGlyphs[Math.floor(Math.random() * allGlyphs.length)];
  }

  // Determine which glyph set to use based on the genre prefix
  let genreSet: string[];
  if (genre.toLowerCase().startsWith('science fiction:')) {
    genreSet = [...GLYPH_SETS.common, ...GLYPH_SETS.scifi];
  } else if (genre.toLowerCase().startsWith('fantasy:')) {
    genreSet = [...GLYPH_SETS.common, ...GLYPH_SETS.fantasy];
  } else if (genre.toLowerCase().startsWith('historical:')) {
    genreSet = [...GLYPH_SETS.common, ...GLYPH_SETS.historical];
  } else if (genre.toLowerCase().startsWith('mythological:')) {
    genreSet = [...GLYPH_SETS.common, ...GLYPH_SETS.mythological];
  } else {
    // For any other genre or no match, use all glyphs (same as main menu)
    genreSet = [
      ...GLYPH_SETS.common,
      ...GLYPH_SETS.scifi,
      ...GLYPH_SETS.fantasy,
      ...GLYPH_SETS.historical,
      ...GLYPH_SETS.mythological,
    ];
  }

  return genreSet[Math.floor(Math.random() * genreSet.length)];
}

// --- GLYPH FIELD OVERLAY COMPONENT ---
const GlyphFieldOverlay = React.forwardRef<{ shuffleGlyphs: () => void }, { currentScenario?: string | null }>(
  ({ currentScenario }, ref) => {
  // Calculate grid size based on viewport
  const [dimensions, setDimensions] = React.useState({ cols: 32, rows: 18 });
  const [glyphs, setGlyphs] = React.useState<string[]>([]);

  React.useEffect(() => {
    function updateDimensions() {
      const glyphSize = 18; // px
      const cols = Math.ceil(window.innerWidth / glyphSize);
      const rows = Math.ceil(window.innerHeight / glyphSize);
      setDimensions({ cols, rows });
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Shuffle glyphs function
  const randomizeGlyphs = React.useCallback(() => {
    setGlyphs(Array.from({ length: dimensions.rows * dimensions.cols }, () => getRandomGlyphForGenre(currentScenario)));
  }, [dimensions, currentScenario]);

  React.useEffect(() => {
    randomizeGlyphs();
  }, [dimensions, currentScenario, randomizeGlyphs]);

  // Expose shuffleGlyphs to parent via ref
  React.useImperativeHandle(ref, () => ({
    shuffleGlyphs: randomizeGlyphs
  }), [randomizeGlyphs]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        opacity: 0.12,
        color: '#000',
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        fontSize: '0.7rem',
        lineHeight: 1,
        userSelect: 'none',
        transition: 'opacity 0.5s',
        mixBlendMode: 'multiply',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dimensions.cols}, 1fr)`,
          gridTemplateRows: `repeat(${dimensions.rows}, 1fr)`,
          width: '100vw',
          height: '100vh',
        }}
      >
        {glyphs.map((glyph, i) => (
          <span key={i} style={{ opacity: 0.7 }}>{glyph}</span>
        ))}
      </div>
    </div>
  );
});

// Utility to remove all asterisks from a string
function removeAsterisks(str: string): string {
  return str.replace(/\*/g, '');
}

const App: React.FC = () => { 
  const [currentStory, setCurrentStory] = useState<StoryState>({ 
    sceneDescription: "Welcome to QUARRY.", 
    choices: ["Begin"], 
    persistentThreat: null, 
    threatEncounterMessage: null, 
    combatLog: [], 
    isInCombat: false, 
  }); 
  const [inventory, setInventory] = useState<InventoryItem[]>([]); 
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null); 
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true); 
  
  const [playerHealth, setPlayerHealth] = useState<number>(100);
  const [playerMaxHealth, setPlayerMaxHealth] = useState<number>(100);
  const [isGameOver, setIsGameOver] = useState<boolean>(false); 
  const [gameOverSummaryText, setGameOverSummaryText] = useState<string | null>(null); 
  const [gameEndType, setGameEndType] = useState<string | null>(null);
  const [persistentThreat, setPersistentThreat] = useState<PersistentThreat | null>(null); 
  const [isInCombat, setIsInCombat] = useState<boolean>(false); 
  const [combatLog, setCombatLog] = useState<string[]>([]); 
  const [memoryLog, setMemoryLog] = useState<string[]>([]); 
  const [playerChoices, setPlayerChoices] = useState<string[]>([]); 
  
  const [storyFlags, setStoryFlags] = useState<Record<string, any>>({}); 
  const [playerAbilities, setPlayerAbilities] = useState<{ name: string; description: string; uses?: number }[]>([]); 

  // --- Add systemMemoryLog state (must be before any hooks that use it) ---
  const [systemMemoryLog, setSystemMemoryLog] = useState({
    npcs: [], // Array of {name, role, location, status, relationship, keyInfo, lastInteraction}
    threat: null, // {name, status, health, senses, etc.}
    flags: {},
    inventory: [],
    playerHealth: 100,
  });

  const [isCustomChoiceInputVisible, setIsCustomChoiceInputVisible] = useState<boolean>(false); 
  const [customChoiceText, setCustomChoiceText] = useState<string>(""); 
  const [lastUsedThemeType, setLastUsedThemeType] = useState<ThemeType | null>(null); 
  
  // --- NEW STATE FOR THE CUSTOM SCENARIO MODAL --- 
  const [isCustomScenarioModalVisible, setIsCustomScenarioModalVisible] = useState<boolean>(false); 
  // --- NEW STATE FOR TRACKING LAST USED CUSTOM SCENARIO ---
  const [lastUsedCustomScenario, setLastUsedCustomScenario] = useState<string | null>(null);
  // --- NEW STATE FOR TRACKING CURRENT SCENARIO THEME ---
  const [currentScenarioTheme, setCurrentScenarioTheme] = useState<string | null>(null);
  // --- NEW STATE FOR CUSTOM SCENARIO INPUT ---
  const [isCustomScenarioInputVisible, setIsCustomScenarioInputVisible] = useState<boolean>(false);
  const [customScenarioText, setCustomScenarioText] = useState<string>("");
  const [isReturnToMenuModalVisible, setIsReturnToMenuModalVisible] = useState<boolean>(false);
  const [isSceneTyping, setIsSceneTyping] = useState<boolean>(false);
  const [isGameLogModalVisible, setIsGameLogModalVisible] = useState<boolean>(false);
  const glyphOverlayRef = useRef<{ shuffleGlyphs: () => void }>(null);

  // Typing effect for title (simple type-in, then blinking underscore under Y)
  const fullTitle = 'QUARRY';
  const [typedTitle, setTypedTitle] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const [showBlinkCursor, setShowBlinkCursor] = useState(false);
  const [isUnderscoreVisible, setIsUnderscoreVisible] = useState(true);

  // Use refs to track current state for animation
  const underscorePosRef = useRef(fullTitle.length - 1);
  const underscoreDirRef = useRef(-1);

  // Initial typing animation with blinking underscore during long pauses
  useEffect(() => {
    let i = 0;
    setTypedTitle('');
    setTypingIndex(0);
    setShowBlinkCursor(false);
    let cancelled = false;
    let blinkInterval: NodeJS.Timeout | null = null;

    function typeNextChar() {
      if (cancelled) return;
      setTypedTitle((prev) => {
        if (i < fullTitle.length) {
          const next = prev + fullTitle[i];
          i++;
          setTypingIndex(i);
          setTimeout(typeNextChar, 120);
          return next;
        } else {
          setTypingIndex(fullTitle.length);
          setShowBlinkCursor(true);
          blinkInterval = setInterval(() => {
            setIsUnderscoreVisible((v) => !v);
          }, 500);
          return prev;
        }
      });
    }
    setTimeout(typeNextChar, 400); // Initial pause
    return () => { cancelled = true; if (blinkInterval) clearInterval(blinkInterval); };
  }, []);

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
                tempPlayerAbilities.push({ name: effect.abilityName, description: effect.description, uses: effect.uses ?? undefined }); 
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
                  ? { ...ab, uses: (effect as PlayerAbilityUpdateEffect).newUses ?? undefined, description: (effect as PlayerAbilityUpdateEffect).description || ab.description } 
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
        // Convert initialInventory to InventoryItem format
        const initialInventoryItems: InventoryItem[] = (initialInventory || []).map(item => 
          typeof item === 'string' ? parseInventoryItem(item) : item
        );
        setInventory(initialInventoryItems);
        setPlayerHealth(apiResponse.playerMaxHealth || 100);
        setPlayerMaxHealth(apiResponse.playerMaxHealth || 100);
        setIsInitialLoad(false); 
        tempPlayerHealth = apiResponse.playerMaxHealth || 100; 
        setPlayerHealth(apiResponse.playerMaxHealth || 100);
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
            redacted: (persistentThreatDetails as any).redacted || false,
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
          newPlayerHealthThisTurn = Math.min(playerMaxHealth, newPlayerHealthThisTurn + playerHeal); 
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
        setGameEndType(gameEndType || null);
        setCurrentStory(prev => ({ ...prev, sceneDescription, choices: [], isInCombat: false })); 
      } 

      setIsInCombat(newIsInCombat); 
      setPersistentThreat(tempPersistentThreat); 

      if (addItem) { 
        setInventory(prevInventory => addToInventory(prevInventory, addItem)); 
      } 
      if (removeItem) { 
        setInventory(prevInventory => removeFromInventory(prevInventory, removeItem)); 
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
      combatLog, memoryLog, storyFlags, playerAbilities, gameOverSummaryText, gameEndType 
  ]); 

  const startGame = useCallback(() => { 
    setIsInitialLoad(true); 
    setInventory([]); 
    setPlayerHealth(100); 
    setPlayerMaxHealth(100);
    setIsGameOver(false); 
    setGameOverSummaryText(null); 
    setGameEndType(null);
    setError(null); 
    setPersistentThreat(null); 
    setIsInCombat(false); 
    setCombatLog([]); 
    setMemoryLog([]); 
    setPlayerChoices([]); 
    setStoryFlags({}); 
    setPlayerAbilities([]); 
    setIsCustomChoiceInputVisible(false); 
    setLastUsedThemeType(null); 
    setLastUsedCustomScenario(null); // Reset custom scenario state
    setCurrentScenarioTheme(null); // Reset current scenario theme
    setIsCustomScenarioInputVisible(false); // Reset custom scenario input
    setCustomScenarioText(""); // Reset custom scenario text
    setCurrentStory({ 
        sceneDescription: "Welcome to QUARRY.", 
        choices: ["Begin"], 
        persistentThreat: null, 
        threatEncounterMessage: null, 
        combatLog: [], 
        isInCombat: false, 
    }); 
    
    // Start a new game session
    gameLogService.startNewSession();
  }, []); 

  const getThemesByType = (themeType: ThemeType): string[] => { 
    switch (themeType) { 
        case "random": return [...SCENARIO_THEMES_LIST]; 
        case "realism": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("REALISM:")); 
        case "historical": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Historical:") || t.startsWith("Mythological:")); 
        case "modern": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Contemporary:")); 
        case "sci_fi": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Science Fiction:")); 
        case "fantasy": return SCENARIO_THEMES_LIST.filter(t => t.startsWith("Fantasy:")); 
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
    return SCENARIO_THEMES_LIST[Math.floor(Math.random() * SCENARIO_THEMES_LIST.length)] || "";
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
    setCurrentScenarioTheme(selectedTheme);
    processApiResponse(fetchInitialStory(selectedTheme, systemMemoryLog), true); 
  }, [startGame, processApiResponse, setLastUsedThemeType, setError]); 

  // --- NEW HANDLER FOR CUSTOM SCENARIO SELECTION --- 
  const handleCustomScenarioSelected = useCallback((scenario: string) => { 
    console.log('Selected scenario in handleCustomScenarioSelected:', scenario); // DEBUG
    if (!API_KEY_AVAILABLE) { 
      setError("API Key is not configured."); 
      return; 
    } 
    setIsCustomScenarioModalVisible(false); 
    setLastUsedThemeType(null); 
    setLastUsedCustomScenario(scenario); // Store the selected custom scenario
    setCurrentScenarioTheme(scenario); // Set the scenario theme
    
    // Start a new game session
    gameLogService.startNewSession();
    
    processApiResponse(fetchInitialStory(scenario, systemMemoryLog), true); 
  }, [processApiResponse, setError]);

  // --- NEW HANDLER FOR CUSTOM SCENARIO INPUT ---
  const handleCustomScenarioSubmit = useCallback(() => {
    if (!customScenarioText.trim() || !API_KEY_AVAILABLE) {
      setError("Please enter a valid scenario description.");
      return;
    }
    
    const scenarioText = customScenarioText.trim();
    if (scenarioText.length > 200) {
      setError("Scenario description is too long. Please keep it under 200 characters.");
      return;
    }
    
    setIsCustomScenarioInputVisible(false);
    setLastUsedThemeType(null);
    setLastUsedCustomScenario(scenarioText);
    setCurrentScenarioTheme(scenarioText); // Set the scenario theme
    setCustomScenarioText("");
    
    // Start a new game session
    gameLogService.startNewSession();
    
    processApiResponse(fetchInitialStory(scenarioText, systemMemoryLog), true);
  }, [customScenarioText, processApiResponse, setError]);

  const handleChoiceSelected = useCallback((choice: string | ChoiceType) => { 
    if (isGameOver) return; 
    const choiceText = typeof choice === 'string' ? choice : choice.text; 
    const isTriggeringCombat = typeof choice !== 'string' && !!choice.triggersCombat; 
    
    // Track the player's choice
    setPlayerChoices(prev => [...prev, choiceText]);
    
    if (!isInitialLoad) { 
      // Convert inventory to string format for API compatibility
      const inventoryStrings = inventory.map(item => 
        item.quantity === 1 ? item.name : `${item.quantity} ${item.name}`
      );
      
      processApiResponse(fetchNextStorySegment( 
        currentStory.sceneDescription, choiceText, inventoryStrings, playerHealth, 
        persistentThreat, isInCombat, isTriggeringCombat, memoryLog, storyFlags, playerAbilities, 
        currentScenarioTheme || "Unknown Scenario",
        systemMemoryLog
      )); 
    } 
  }, [ 
      isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, persistentThreat, 
      isInCombat, isGameOver, processApiResponse, memoryLog, storyFlags, playerAbilities, currentScenarioTheme, systemMemoryLog
  ]); 

  const handleCustomChoiceSubmit = useCallback(() => { 
    if (!customChoiceText.trim() || isInitialLoad) return; 
    
    // Track the player's custom choice
    setPlayerChoices(prev => [...prev, customChoiceText.trim()]);
    
    setIsCustomChoiceInputVisible(false); 
    
    // Convert inventory to string format for API compatibility
    const inventoryStrings = inventory.map(item => 
      item.quantity === 1 ? item.name : `${item.quantity} ${item.name}`
    );
    
    processApiResponse(fetchNextStorySegment( 
      currentStory.sceneDescription, customChoiceText.trim(), inventoryStrings, playerHealth, 
      persistentThreat, isInCombat, false, memoryLog, storyFlags, playerAbilities, 
      currentScenarioTheme || "Unknown Scenario",
      systemMemoryLog
    )); 
    setCustomChoiceText(""); 
  }, [ 
    customChoiceText, isInitialLoad, currentStory.sceneDescription, inventory, playerHealth, 
    persistentThreat, isInCombat, processApiResponse, setIsCustomChoiceInputVisible, memoryLog, storyFlags, playerAbilities, currentScenarioTheme, systemMemoryLog
  ]); 

  const handleRegenerateInitialScene = useCallback(() => { 
    if (!API_KEY_AVAILABLE || isLoading) return; 
    
    // If we have a stored custom scenario, use that instead of theme type
    if (lastUsedCustomScenario) {
      setCurrentScenarioTheme(lastUsedCustomScenario);
      processApiResponse(fetchInitialStory(lastUsedCustomScenario, systemMemoryLog), true);
      return;
    }
    
    // Otherwise, use the theme type logic for non-custom scenarios
    const themeTypeToUse = lastUsedThemeType || "random"; 
    const themesToConsider = getThemesByType(themeTypeToUse); 
    const selectedTheme = selectRandomTheme(themesToConsider); 
    if (!selectedTheme) { 
        setError("Failed to select a scenario theme for regeneration."); 
        return; 
    } 
    setCurrentScenarioTheme(selectedTheme);
    processApiResponse(fetchInitialStory(selectedTheme, systemMemoryLog), true); 
  }, [processApiResponse, isLoading, lastUsedThemeType, lastUsedCustomScenario, setError]); 

  const handleReturnToMainMenu = useCallback(() => {
    setIsReturnToMenuModalVisible(false);
    startGame();
  }, [startGame]);

  // Auto-save game log function
  const saveGameLog = useCallback(async () => {
    if (isInitialLoad) return; // Don't save on initial load
    
    // Build comprehensive story log
    const buildStoryLog = (): string[] => {
      const storyLog: string[] = [];
      
      // Add initial scenario description
      if (memoryLog.length > 0) {
        storyLog.push(`SCENARIO: ${currentScenarioTheme || "Unknown Scenario"}\n`);
        storyLog.push(`${memoryLog[0]}\n`);
      }
      
      // Add story progression
      for (let i = 0; i < playerChoices.length; i++) {
        const choice = playerChoices[i];
        const memoryEntry = memoryLog[i + 1]; // +1 because first entry is initial scene
        
        // Add player choice
        storyLog.push(`\n▶ You chose: ${choice}`);
        
        // Add corresponding memory entry (story progression)
        if (memoryEntry) {
          storyLog.push(`${memoryEntry}\n`);
        }
      }
      
      // Add combat log entries if any
      if (combatLog.length > 0) {
        storyLog.push(`\n--- COMBAT LOG ---`);
        combatLog.forEach(entry => {
          storyLog.push(`▶ ${entry}`);
        });
        storyLog.push(`--- END COMBAT ---\n`);
      }
      
      // Add game over summary if game is finished
      if (isGameOver && gameOverSummaryText) {
        storyLog.push(`\n--- GAME END ---`);
        storyLog.push(`${gameOverSummaryText}`);
        storyLog.push(`--- END GAME ---`);
      }
      
      return storyLog;
    };
    
    try {
      await gameLogService.saveGameLog({
        scenario: currentScenarioTheme || "Unknown Scenario",
        gameEndType: isGameOver ? (gameEndType as any) || 'player_defeat' : 'ongoing',
        gameOverSummary: gameOverSummaryText || undefined,
        storyLog: buildStoryLog(),
        finalInventory: inventory.map(item => ({ name: item.name, quantity: item.quantity })),
        finalHealth: playerHealth,
        finalMaxHealth: playerMaxHealth,
        playerAbilities: [...playerAbilities],
        storyFlags: { ...storyFlags },
        totalTurns: playerChoices.length
      });
    } catch (error) {
      console.error('Failed to save game log:', error);
    }
  }, [
    isInitialLoad, currentScenarioTheme, isGameOver, gameEndType, gameOverSummaryText,
    memoryLog, playerChoices, combatLog, inventory, playerHealth, playerMaxHealth,
    playerAbilities, storyFlags
  ]);

  // Auto-save on game over
  useEffect(() => {
    if (isGameOver && !isInitialLoad) {
      saveGameLog();
    }
  }, [isGameOver, isInitialLoad, saveGameLog]);

  // Auto-save after each choice (with debouncing)
  useEffect(() => {
    if (!isInitialLoad && playerChoices.length > 0 && !isGameOver) {
      const timeoutId = setTimeout(() => {
        saveGameLog();
      }, 1000); // Debounce saves by 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [playerChoices.length, isInitialLoad, isGameOver, saveGameLog]);

  // Initialize game log service
  useEffect(() => {
    gameLogService.init();
  }, []);

  if (!API_KEY_AVAILABLE) { 
    return <ApiKeyMissingBanner />; 
  } 
  
  const currentDisplayedChoices = currentStory.choices; 
  const isDisplayingInitialStartOptions = isInitialLoad && !isLoading && currentStory.choices.length === 1 && currentStory.choices[0] === "Begin"; 
  const showRegenerateButton = !isInitialLoad && !isLoading && !isGameOver && !isCustomChoiceInputVisible && memoryLog.length <= 1 && currentDisplayedChoices.length > 0; 

  const themeButtonBaseClass = "w-full font-semibold py-3 px-5 text-lg border bg-gray-200 text-gray-900 focus:outline-none"; 
  const randomThemeButtonClass = `${themeButtonBaseClass} bg-yellow-400`; 
  const realismThemeButtonClass = `${themeButtonBaseClass} text-white bg-red-800`; 
  const specificThemeButtonClass = `${themeButtonBaseClass} text-white bg-gray-600`; 
  const customThemeButtonClass = `${themeButtonBaseClass} text-yellow-300 bg-gray-700`;

  return ( 
    <div className={`min-h-screen bg-gradient-to-br from-red-800 via-black to-red-800 text-white flex flex-col items-center justify-start pt-4 pb-4 pl-2 pr-4 selection:bg-red-700 selection:text-white font-['Inter']${isInitialLoad ? ' overflow-hidden' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
      {/* Glyph overlay with ref for shuffling */}
      <GlyphFieldOverlay ref={glyphOverlayRef} currentScenario={currentScenarioTheme} />
      {isLoading && <LoadingIndicator message={isInitialLoad && !currentStory.sceneDescription.startsWith("Welcome") ? "Loading..." : "Processing..."} scenario={currentScenarioTheme} />} 
      
      <header className="w-full max-w-3xl text-center mb-6 md:mb-8"> 
        <h1 
          className={`uppercase font-medium tracking-wider text-yellow-400 italic font-['Chakra_Petch'] ${!isDisplayingInitialStartOptions ? 'cursor-pointer hover:text-yellow-300 transition-colors duration-150' : ''}`}
          style={{ fontSize: '3.5rem', letterSpacing: '0.1em', minHeight: '5rem', position: 'relative' }}
          onClick={!isDisplayingInitialStartOptions ? () => setIsReturnToMenuModalVisible(true) : undefined}
          title={!isDisplayingInitialStartOptions ? "Click to return to main menu" : undefined}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            {/* Show animated title with blinking cursor on both home screen and game screen */}
            {typedTitle.split('').map((char, idx) => (
              <span key={idx} style={{ position: 'relative', display: 'inline-block', minWidth: '1em' }}>
                {char}
                {/* Blinking underscore under Y after typing finishes - show on both home and game screen */}
                {showBlinkCursor && !isSceneTyping && idx === fullTitle.length - 1 && isUnderscoreVisible && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: '-0.18em',
                    color: '#ffe066',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    fontSize: '1.1em',
                    textAlign: 'center',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}>
                    _
                  </span>
                )}
              </span>
            ))}
          </span>
        </h1> 
      </header> 

      <main className="w-full max-w-3xl flex flex-col items-center"> 
        
        {(!isInitialLoad || currentStory.sceneDescription !== "Welcome to QUARRY.") && ( 
            <div className="relative w-full max-w-3xl mb-8">
                <StoryDisplay 
                  text={removeAsterisks(currentStory.sceneDescription)} 
                  onTypingStateChange={setIsSceneTyping}
                />
                {showRegenerateButton && (
                    <button
                        onClick={handleRegenerateInitialScene}
                        disabled={isLoading}
                        className="absolute top-2 right-2 bg-gray-500 text-white font-semibold p-1.5 shadow-md transition-all duration-150 ease-in-out hover:bg-gray-400 hover:shadow-lg transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-base border border-gray-400"
                        style={{ borderRadius: '4px' }}
                        title="Regenerate Initial Scene (same category)"
                        aria-label="Regenerate Initial Scene (same category)"
                    >
                        ⥁
                    </button>
                )}
            </div>
        )} 

        {currentStory.persistentThreat && !isInitialLoad && (
          <PersistentThreatDisplay
            threat={{
              ...currentStory.persistentThreat,
              name: removeAsterisks(currentStory.persistentThreat.name),
              description: removeAsterisks(currentStory.persistentThreat.description),
            }}
            message={currentStory.threatEncounterMessage ? removeAsterisks(currentStory.threatEncounterMessage) : undefined}
            isInCombat={currentStory.isInCombat}
          />
        )} 
        
        {!isGameOver && !isInitialLoad && ( 
          <div className="w-full max-w-lg text-center my-4"> 
            <div className="relative w-full bg-gray-700 h-6 border-2 border-gray-600 overflow-hidden shadow-md" style={{ borderRadius: '4px' }}> 
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <span className="text-yellow-200 text-sm font-semibold" title={`Health: ${playerHealth}/${playerMaxHealth}`} aria-label={`Health: ${playerHealth} out of ${playerMaxHealth}`}>HEALTH</span>
              </div>
              <div 
                className="bg-gradient-to-r from-red-500 to-red-700 h-full transition-all duration-300 ease-out" 
                style={{ width: `${Math.max(0, (playerHealth / playerMaxHealth) * 100)}%`, borderRadius: '2px' }}
                aria-valuenow={playerHealth}
                aria-valuemin={0}
                aria-valuemax={playerMaxHealth}
              ></div>
            </div> 
          </div> 
        )} 

        {!isInitialLoad && <InventoryDisplay items={inventory} />} 

        {!isInitialLoad && playerAbilities.length > 0 && !isGameOver && (
            <div className="bg-purple-800 bg-opacity-60 backdrop-blur-md p-4 shadow-xl mb-6 max-w-3xl w-full border border-purple-600" style={{ borderRadius: '4px' }}> 
                <h3 className="text-lg font-semibold text-purple-200 mb-2 border-b border-purple-300 pb-1">Abilities:</h3> 
                <ul className="list-none text-gray-200 flex flex-col space-y-1 custom-scroll max-h-24 overflow-y-auto pr-2"> 
                    {playerAbilities.map((ability, index) => ( 
                        <li key={index} className="text-sm py-0.5 hover:text-purple-100 transition-colors duration-150" title={ability.description}> 
                            <span className="text-purple-300 mr-1.5">✪</span> {ability.name} {ability.uses !== undefined && ability.uses !== null ? `(${ability.uses} use${ability.uses === 1 ? '' : 's'} left)` : ''} 
                        </li> 
                    ))} 
                </ul> 
            </div> 
        )} 

        {currentStory.isInCombat && currentStory.combatLog.length > 0 && !isGameOver && ( 
          <div className="bg-gray-800 bg-opacity-75 p-3 shadow-md mb-4 max-w-3xl w-full max-h-40 overflow-y-auto custom-scroll border border-gray-600" style={{ borderRadius: '4px' }}> 
            <h4 className="text-md font-semibold text-red-400 mb-1">Threat Log:</h4> 
            {currentStory.combatLog.map((logEntry, index) => ( 
              <p key={index} className="text-sm text-gray-200 py-0.5 whitespace-pre-line">▶ {logEntry}</p> 
            ))} 
          </div> 
        )} 

        {isGameOver && (persistentThreat?.status === 'defeated' || gameEndType === 'alternate_win') && ( 
           <div className="w-full max-w-3xl flex flex-col items-center my-6"> 
            <p className="text-4xl font-bold text-green-400 my-4 tracking-wider uppercase" 
               aria-live="polite"> 
                SUCCESS 
            </p> 
            <div className="bg-green-800 bg-opacity-60 backdrop-blur-md p-6 shadow-xl mb-6 max-w-2xl w-full text-center border-2 border-green-600" style={{ borderRadius: '4px' }}>
              <p className="text-lg mb-4 whitespace-pre-line text-green-100 leading-relaxed"> 
                {gameOverSummaryText || "Victory achieved."} 
              </p> 
            </div>
            <button 
              onClick={startGame} 
              className="bg-gray-600 text-white font-semibold py-3 px-6 shadow-md transition-all duration-150 ease-in-out hover:bg-gray-500 hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 text-lg border border-gray-400" 
              style={{ borderRadius: '4px' }}
            > 
              Play Again 
            </button> 
           </div> 
        )}

        {isGameOver && persistentThreat?.status !== 'defeated' && gameEndType !== 'alternate_win' && ( 
          <div className="bg-black bg-opacity-80 p-6 shadow-xl mb-6 max-w-3xl w-full text-center border-2 border-red-700" style={{ borderRadius: '4px' }}> 
            <h2 className="text-3xl font-bold text-red-500 mb-3">GAME OVER</h2> 
            <p className="text-xl mb-4 whitespace-pre-line text-gray-300"> 
              {error || gameOverSummaryText || "The End."} 
            </p> 
            <button 
              onClick={startGame} 
              className="mt-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 shadow-md transition duration-150 text-lg border border-gray-500" 
              style={{ borderRadius: '4px' }}
            > 
              Play Again 
            </button> 
           </div> 
        )} 

        {error && !isGameOver && ( 
          <div className="bg-red-800 bg-opacity-90 p-4 shadow-md mb-6 max-w-3xl w-full text-center" style={{ borderRadius: '4px' }}> 
            <p className="font-semibold text-yellow-300">Error:</p> 
            <p className="text-gray-200">{error}</p> 
            <button 
              onClick={startGame} 
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 shadow transition duration-150 border border-gray-500" 
              style={{ borderRadius: '4px' }}
            > 
              Restart 
            </button> 
          </div> 
        )} 
        
        <div className="w-full max-w-xl flex flex-col items-center mt-4 md:mt-6"> 

            {isDisplayingInitialStartOptions && (
                <div className="w-full flex flex-col items-center">
                    <button 
                        key="random" 
                        onClick={() => handleStartGameWithTheme("random")}
                        className={randomThemeButtonClass + " focus:ring-2 focus:ring-black focus:ring-opacity-75"} 
                        disabled={isLoading} 
                    > 
                        RANDOM
                    </button> 
                    {/* Category random buttons in 2-column, 3-row grid on mobile */}
                    <div className="w-full grid grid-cols-2 gap-3 my-4 sm:my-6">
                        <button
                            key="realism"
                            onClick={() => handleStartGameWithTheme("realism")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-red-800 text-white border-red-900 hover:bg-red-700 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            REALISM
                        </button>
                        <button
                            key="contemporary"
                            onClick={() => handleStartGameWithTheme("modern")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            CONTEMPORARY
                        </button>
                        <button
                            key="fantasy"
                            onClick={() => handleStartGameWithTheme("fantasy")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            FANTASY
                        </button>
                        <button
                            key="historical"
                            onClick={() => handleStartGameWithTheme("historical")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            HISTORICAL
                        </button>
                        <button
                            key="mythological"
                            onClick={() => handleStartGameWithTheme("mythological")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            MYTHOLOGICAL
                        </button>
                        <button
                            key="science_fiction"
                            onClick={() => handleStartGameWithTheme("sci_fi")}
                            className="w-full font-semibold py-2 px-2 text-base border bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 focus:outline-none sm:py-3 sm:px-5 sm:text-lg transition-colors"
                            disabled={isLoading}
                        >
                            SCIENCE FICTION
                        </button>
                    </div>
                    {/* Existing Select and Custom buttons */}
                    <button 
                      key="select" 
                      onClick={() => setIsCustomScenarioModalVisible(true)} 
                      className="w-full font-semibold py-3 px-5 text-lg border bg-black text-yellow-300 border-yellow-700 hover:bg-gray-900 focus:outline-none transition-colors" 
                      disabled={isLoading} 
                    > 
                      SELECT...
                    </button> 
                    <div className="h-3" /> {/* Add vertical gap between buttons */}
                    <button 
                      key="custom" 
                      onClick={() => setIsCustomScenarioInputVisible(true)} 
                      className="w-full font-semibold py-3 px-5 text-lg border bg-black text-yellow-300 border-yellow-700 hover:bg-gray-900 focus:outline-none transition-colors" 
                      disabled={isLoading} 
                    > 
                      CUSTOM...
                    </button> 
                </div>
            )}

            {/* Custom Scenario Input Modal */}
            {isDisplayingInitialStartOptions && isCustomScenarioInputVisible && !isLoading && (
                <div className="w-full flex flex-col items-center space-y-3 mt-4">
                    <div className="w-full max-w-md">
                        <label htmlFor="customScenario" className="block text-sm font-medium text-gray-300 mb-2">
                            Enter your custom scenario:
                        </label>
                        <textarea 
                            id="customScenario"
                            value={customScenarioText} 
                            onChange={(e) => setCustomScenarioText(e.target.value)} 
                            placeholder='(Add "REALISM:" for Realism Mode)'
                            rows={3} 
                            maxLength={200}
                            className="w-full p-3 bg-gray-800 text-white border border-gray-600 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150" 
                            style={{ borderRadius: '4px' }}
                            disabled={isLoading} 
                            aria-label="Custom scenario input" 
                        />
                        <div className="text-xs text-gray-400 mt-1 text-right">
                            {customScenarioText.length}/200 characters
                        </div>
                    </div>
                    <div className="flex space-x-3 w-full sm:w-auto">
                        <button 
                            onClick={handleCustomScenarioSubmit} 
                            disabled={isLoading || !customScenarioText.trim()} 
                            className="flex-1 sm:flex-none bg-red-600 text-white font-semibold py-3 px-5 shadow-md hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-red-400 disabled:cursor-not-allowed border border-red-500" 
                            style={{ borderRadius: '4px' }}
                        > 
                            Start Game 
                        </button> 
                        <button 
                            onClick={() => setIsCustomScenarioInputVisible(false)} 
                            disabled={isLoading} 
                            className="flex-1 sm:flex-none bg-gray-700 text-white font-semibold py-3 px-5 shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed border border-gray-600" 
                            style={{ borderRadius: '4px' }}
                        > 
                            Cancel 
                        </button>
                    </div> 
                </div> 
            )}

            {!isDisplayingInitialStartOptions && isCustomChoiceInputVisible && !isGameOver && !isLoading && ( 
                <div className="w-full flex flex-col items-center space-y-3"> 
                    <textarea 
                        id="customChoice" 
                        value={customChoiceText} 
                        onChange={(e) => setCustomChoiceText(e.target.value)} 
                        placeholder="Describe your action in detail..." 
                        rows={3} 
                        className="w-full p-3 bg-gray-800 text-white border border-gray-600 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150" 
                        style={{ borderRadius: '4px' }}
                        disabled={isLoading} 
                        aria-label="Custom choice input" 
                    />
                    <div className="flex space-x-3 w-full sm:w-auto">
                        <button 
                            onClick={handleCustomChoiceSubmit} 
                            disabled={isLoading || !customChoiceText.trim()} 
                            className="flex-1 sm:flex-none bg-gray-600 text-white font-semibold py-3 px-5 shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed border border-gray-400" 
                            style={{ borderRadius: '4px' }}
                        > 
                            Submit 
                        </button> 
                        <button 
                            onClick={() => setIsCustomChoiceInputVisible(false)} 
                            disabled={isLoading} 
                            className="flex-1 sm:flex-none bg-gray-700 text-white font-semibold py-3 px-5 shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed border border-gray-600" 
                            style={{ borderRadius: '4px' }}
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
                        className="w-full bg-gray-700 text-white font-semibold py-3 px-5 shadow-md 
                                     transition-all duration-150 ease-in-out 
                                     hover:bg-gray-600 hover:shadow-lg transform hover:scale-105 
                                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 
                                     disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none 
                                     border border-gray-600 mb-4" 
                        style={{ borderRadius: '4px' }}
                    > 
                        Write your own... 
                    </button> 

                    {currentDisplayedChoices.length > 0 && ( 
                        <ChoicesDisplay 
                            choices={currentStory.choices.map(choice => typeof choice === 'string' ? removeAsterisks(choice) : { ...choice, text: removeAsterisks(choice.text) })} 
                            onChoiceSelected={handleChoiceSelected} 
                            isInCombat={currentStory.isInCombat} 
                        /> 
                    )} 
                </> 
            )} 

            {/* Enhanced Memory Log - Shows below choices */}
            {!isDisplayingInitialStartOptions && !isGameOver && !isLoading && (memoryLog.length > 0 || playerChoices.length > 0) && (
                <div className="w-full max-w-3xl mt-6">
                    <div className="bg-gray-700 bg-opacity-60 backdrop-blur-md p-4 shadow-xl border border-gray-500" style={{ borderRadius: '4px' }}>
                        <h3 className="text-lg font-semibold text-yellow-300 mb-3 border-b border-yellow-400 pb-1">Memory Log:</h3>
                        <div className="max-h-48 overflow-y-auto custom-scroll pr-2 space-y-2">
                            {(() => {
                                type TimelineItem = { type: 'event' | 'choice'; content: string; originalIndex: number };
                                const timeline: TimelineItem[] = [];
                                memoryLog.slice(-6).forEach((entry, index) => {
                                    timeline.push({
                                        type: 'event',
                                        content: removeAsterisks(entry),
                                        originalIndex: index
                                    });
                                });
                                playerChoices.slice(-4).forEach((choice, index) => {
                                    timeline.push({
                                        type: 'choice',
                                        content: removeAsterisks(choice),
                                        originalIndex: index
                                    });
                                });
                                timeline.sort((a, b) => a.originalIndex - b.originalIndex);
                                return timeline.map((item, index) => (
                                    <div
                                        key={`timeline-${index}`}
                                        className={`text-sm text-gray-200 py-1 border-l-2 pl-3 ${
                                            item.type === 'event'
                                                ? 'border-yellow-400'
                                                : 'border-red-700'
                                        }`}
                                    >
                                        <span className={`font-medium ${
                                            item.type === 'event'
                                                ? 'text-yellow-300'
                                                : 'text-red-300'
                                        }`}>
                                            {item.type === 'event' ? 'Event:' : 'Choice:'}
                                        </span> {item.content}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
      
      {/* SVG Eye positioned at bottom of content */}
      {!isLoading && (
        <img 
          src="eye.svg" 
          alt="Technohorror Eye" 
          style={{ 
            width: '25%',
            height: 'auto',
            display: 'block',
            cursor: 'pointer',
            maxWidth: '120px',
            margin: '0 auto',
            marginTop: '20px',
            marginBottom: '20px',
          }}
          className="md:w-[6%] md:max-w-[30px]"
          onClick={isDisplayingInitialStartOptions ? () => setIsGameLogModalVisible(true) : () => glyphOverlayRef.current?.shuffleGlyphs()}
          tabIndex={0}
          role="button"
          aria-label={isDisplayingInitialStartOptions ? "View Game Logs" : "Shuffle glyphs"}
        />
      )}
      
      <ScenarioSelectorModal
        isOpen={isCustomScenarioModalVisible}
        onClose={() => setIsCustomScenarioModalVisible(false)}
        onScenarioSelected={handleCustomScenarioSelected}
        scenarios={SCENARIO_THEMES_LIST}
      />

      <GameLogModal
        isOpen={isGameLogModalVisible}
        onClose={() => setIsGameLogModalVisible(false)}
      />

      {/* Return to Menu Modal */}
      {isReturnToMenuModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 p-6 rounded-lg max-w-md w-full text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Return to Main Menu?</h3>
            <p className="text-gray-300 mb-6">
              This will end your current game and return you to the main menu. All progress will be lost.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => {
                  setIsReturnToMenuModalVisible(false);
                  startGame();
                }}
                className="bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-500 transition-colors"
              >
                Yes, Return
              </button>
              <button
                onClick={() => setIsReturnToMenuModalVisible(false)}
                className="bg-gray-600 text-white font-semibold py-2 px-4 rounded hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;