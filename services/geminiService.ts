// services/geminiService.ts

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME, GEMINI_SYSTEM_INSTRUCTION_JSON, INITIAL_GAME_PROMPT_JSON } from '../constants';
import { GeminiApiResponse, PersistentThreat, PlayerAbilityEffect, StoryFlagEffect } from '../types';

// --- CONFIGURATION PROTOCOL ---
// To switch between AI Labs Preview and Live MVP Deployment:
// 1. For AI LABS PREVIEW:
//    - Ensure the "AI LABS PREVIEW CONFIGURATION" section below is UNCOMMENTED.
//    - Ensure the "MVP DEPLOYMENT CONFIGURATION" section below is COMMENTED OUT.
//    - Ensure the import from './env.js' further below is COMMENTED OUT.
// 2. For LIVE MVP DEPLOYMENT (e.g., Netlify, Vercel):
//    - Ensure the "AI LABS PREVIEW CONFIGURATION" section below is COMMENTED OUT.
//    - Ensure the "MVP DEPLOYMENT CONFIGURATION" section below is UNCOMMENTED.
//    - Ensure the import from './env.js' further below is UNCOMMENTED.
// --- END CONFIGURATION PROTOCOL ---





// --- MVP DEPLOYMENT CONFIGURATION ---

import { API_KEY as API_KEY_FROM_ENV_JS } from '../env.js'; // Use ../ to go up to the root

let ai: GoogleGenAI | null = null;

// Directly use the key imported from the env.js file created during the build.
const effectiveApiKey: string | undefined = API_KEY_FROM_ENV_JS;

if (effectiveApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: effectiveApiKey });
  } catch (e) {
    console.error("Critical Error (MVP Deployment Config): Failed to initialize GoogleGenAI client with effectiveApiKey. Services will be unavailable.", e);
    ai = null;
  }
} else {
  console.warn("API Key is not available from env.js (MVP Deployment Config). Gemini services will not function.");
}

// --- END MVP DEPLOYMENT CONFIGURATION ---


function parseGeminiJsonResponse<T>(responseText: string): T {
  let originalTextForParsing = responseText;
  let directParseError: Error | undefined;
  let fencedContent: string | undefined;
  let fencedParseError: Error | undefined;
  let substringToParse: string | undefined;
  let substringParseError: Error | undefined;
  let wasPreprocessedUnclosedBoolean = false;
  let wasPreprocessedKorean = false;
  let wasPreprocessedChineseComment = false;
  let wasPreprocessedGeneralProse = false;
  let wasPreprocessedMissingComma = false;
  let wasPreprocessedBengaliBeforeGenerating = false; 

  const unclosedBooleanRegex = /(true|false)(\s*,\s*)(\{)/g;
  const textAfterUnclosedBooleanFix = originalTextForParsing.replace(unclosedBooleanRegex, '$1}, $3');
  if (textAfterUnclosedBooleanFix !== originalTextForParsing) {
    wasPreprocessedUnclosedBoolean = true;
    originalTextForParsing = textAfterUnclosedBooleanFix;
  }

  const problematicKoreanPatternRegex = /("triggersCombat"\s*:\s*false)\s*(조회)\s*([\,\}\]])/g;
  const textAfterKoreanFix = originalTextForParsing.replace(problematicKoreanPatternRegex, '$1$3');
  if (textAfterKoreanFix !== originalTextForParsing) {
    wasPreprocessedKorean = true;
    originalTextForParsing = textAfterKoreanFix;
  }

  const problematicChineseCommentRegex = /("triggersCombat"\s*:\s*(?:true|false))\s*(打了.*?)\s*([\,\}\]])/gs;
  const textAfterChineseCommentFix = originalTextForParsing.replace(problematicChineseCommentRegex, '$1$3');
  if (textAfterChineseCommentFix !== originalTextForParsing) {
    wasPreprocessedChineseComment = true;
    originalTextForParsing = textAfterChineseCommentFix;
  }
  
  const specificBengaliBlockWithSuffixRegex = /("triggersCombat"\s*:\s*(?:true|false))(\s*ইংরে[\s\S]*?Before generating[\s\S]*?)(?=([\,\}\]]))/g;
  const textAfterSpecificBengaliFix = originalTextForParsing.replace(specificBengaliBlockWithSuffixRegex, '$1'); 
  if (textAfterSpecificBengaliFix !== originalTextForParsing) {
    wasPreprocessedBengaliBeforeGenerating = true;
    originalTextForParsing = textAfterSpecificBengaliFix;
  }

  const problematicGeneralProseRegex = /("triggersCombat"\s*:\s*(?:true|false))(\s*[^"'{}\[\],][^}\],]*?\s*)(?=([\,\}]))/gs;
  const textAfterGeneralProseFix = originalTextForParsing.replace(problematicGeneralProseRegex, '$1');
  if (textAfterGeneralProseFix !== originalTextForParsing) {
    wasPreprocessedGeneralProse = true;
    originalTextForParsing = textAfterGeneralProseFix;
  }
  
  const missingCommaRegex = /(\})\s*(\{)/g;
  const textAfterMissingCommaFix = originalTextForParsing.replace(missingCommaRegex, '$1,$2');
  if (textAfterMissingCommaFix !== originalTextForParsing) {
    wasPreprocessedMissingComma = true;
    originalTextForParsing = textAfterMissingCommaFix;
  }

  try {
    return JSON.parse(originalTextForParsing.trim()) as T;
  } catch (e) {
    directParseError = e as Error;
  }

  const fenceRegex = /```(?:json)?\s*\n?(.*?)\n?\s*```/s;
  const match = originalTextForParsing.match(fenceRegex);
  if (match && match[1]) {
    fencedContent = match[1].trim();
    if (fencedContent) {
        try {
        return JSON.parse(fencedContent) as T;
        } catch (e) {
        fencedParseError = e as Error;
        }
    } else {
        fencedParseError = new Error("Fenced block found but content was empty.");
    }
  }

  const firstBrace = originalTextForParsing.indexOf('{');
  const lastBrace = originalTextForParsing.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    substringToParse = originalTextForParsing.substring(firstBrace, lastBrace + 1).trim();
    if (substringToParse) {
        try {
        return JSON.parse(substringToParse) as T;
        } catch (e) {
        substringParseError = e as Error;
        }
    } else {
        substringParseError = new Error("Substring heuristic yielded empty string.");
    }
  }

  const errorDetails = {
    directParseError: directParseError?.message,
    fencedBlockFound: !!match,
    fencedContentPreview: fencedContent ? (fencedContent.substring(0, 100) + (fencedContent.length > 100 ? '...' : '')) : "N/A",
    fencedParseError: fencedParseError?.message,
    substringHeuristicAttempted: !!substringToParse,
    substringContentPreview: substringToParse ? (substringToParse.substring(0,100) + (substringToParse.length > 100 ? '...' : '')) : "N/A",
    substringParseError: substringParseError?.message,
    wasPreprocessedUnclosedBoolean: wasPreprocessedUnclosedBoolean,
    wasPreprocessedKorean: wasPreprocessedKorean,
    wasPreprocessedChineseComment: wasPreprocessedChineseComment,
    wasPreprocessedBengaliBeforeGenerating: wasPreprocessedBengaliBeforeGenerating,
    wasPreprocessedGeneralProse: wasPreprocessedGeneralProse,
    wasPreprocessedMissingComma: wasPreprocessedMissingComma,
  };

  const MAX_LOG_PREVIEW_LENGTH = 4000;

  console.error(
    `Failed to parse JSON response after all attempts. Raw text for review (up to ${MAX_LOG_PREVIEW_LENGTH} chars):`,
    responseText.substring(0, MAX_LOG_PREVIEW_LENGTH) + (responseText.length > MAX_LOG_PREVIEW_LENGTH ? '...' : ''),
    "Error Details:",
    errorDetails 
  );
  throw new Error("The AI's response was not in the expected JSON format. Please try again.");
}

export interface InitialStoryData extends GeminiApiResponse {
}

export const fetchInitialStory = async (selectedTheme: string, systemMemoryLog: any): Promise<InitialStoryData> => {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing, invalid, or client instantiation failed.");
  
  const systemMemoryLogString = '[SYSTEM MEMORY LOG]\n' + JSON.stringify(systemMemoryLog, null, 2);
  const themedInitialPromptJson = INITIAL_GAME_PROMPT_JSON.replace(
    "[SCENARIO_THEME_PLACEHOLDER]",
    selectedTheme
  ) + '\n' + systemMemoryLogString;
  console.log('Prompt sent to LLM in fetchInitialStory:', themedInitialPromptJson); // DEBUG

  const MAX_ATTEMPTS = 2;
  let attempts = 0;
  let lastError: Error | undefined;
  let apiCallResponse: GenerateContentResponse | undefined;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    apiCallResponse = undefined; // Reset for each attempt
    try {
      apiCallResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: themedInitialPromptJson,
        config: {
          systemInstruction: GEMINI_SYSTEM_INSTRUCTION_JSON,
          maxOutputTokens: 8000,
        },
      });

      const responseText = apiCallResponse.text;
      if (!responseText) {
          throw new Error(`Received empty response text from Gemini API for initial story on attempt ${attempts}.`);
      }
      const parsedResponse = parseGeminiJsonResponse<GeminiApiResponse>(responseText);

      if (!parsedResponse.persistentThreatDetails?.name) {
        console.warn("AI did not provide full persistentThreatDetails. Using defaults.");
        parsedResponse.persistentThreatDetails = {
          name: "The Nameless Dread",
          description: "A chilling presence that haunts your steps.",
          maxHealth: 50,
          senses: [],
        };
      }
      if (!parsedResponse.initialInventory || parsedResponse.initialInventory.length === 0) {
        console.warn("AI did not provide initialInventory. Player will start with no items.");
        parsedResponse.initialInventory = [];
      }
      if (parsedResponse.persistentThreatDetails && typeof parsedResponse.persistentThreatDetails.maxHealth !== 'number') {
          parsedResponse.persistentThreatDetails.maxHealth = 50;
      }
      if (parsedResponse.persistentThreatDetails && !parsedResponse.persistentThreatDetails.senses) {
        parsedResponse.persistentThreatDetails.senses = [];
      }


      return parsedResponse; // Success
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempts} failed for initial story:`, error);
      if (apiCallResponse) {
        console.error("Gemini API Diagnostic Info (Initial Story - Attempt ${attempts}):");
        console.error("  Finish Reason:", apiCallResponse.candidates?.[0]?.finishReason);
        console.error("  Safety Ratings:", JSON.stringify(apiCallResponse.candidates?.[0]?.safetyRatings, null, 2));
        if (apiCallResponse.promptFeedback) {
          console.error("  Prompt Feedback:", JSON.stringify(apiCallResponse.promptFeedback, null, 2));
        }
        console.error(`Raw response text on failed attempt ${attempts} (Initial Story):\n${apiCallResponse.text?.substring(0, 1000) || "N/A"}`);
      } else {
        console.error(`Raw response text was unavailable on failed attempt ${attempts} (Initial Story).`);
      }


      if (attempts >= MAX_ATTEMPTS) {
        console.error(`All ${MAX_ATTEMPTS} attempts failed for initial story. Rethrowing last error.`);
        throw lastError;
      }
      console.warn(`Retrying API call for initial story (attempt ${attempts + 1} of ${MAX_ATTEMPTS})...`);
    }
  }
  // Fallback, should ideally be caught by the rethrow in the loop
  throw lastError || new Error("All API call attempts for initial story failed.");
};

export const fetchNextStorySegment = async (
  previousScene: string,
  playerChoiceText: string,
  inventory: string[],
  playerHealth: number,
  currentThreat: PersistentThreat | null,
  isInCombat: boolean,
  isInitiatingCombatByChoice: boolean,
  memoryLog: string[],
  currentStoryFlags: Record<string, any>,
  currentPlayerAbilities: { name: string; description: string; uses?: number }[],
  scenarioTheme: string,
  systemMemoryLog: any
): Promise<GeminiApiResponse> => {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing, invalid, or client instantiation failed.");

  const inventoryString = inventory.length > 0 ? `[${inventory.map(item => `"${item}"`).join(", ")}]` : "[] (empty)";

  let threatContextString = "Pursuer context: Not currently known or not relevant.";
  if (currentThreat) {
    threatContextString = `Current Pursuer: ${currentThreat.name}. Status: ${currentThreat.status}. Current Health: ${currentThreat.currentHealth}/${currentThreat.maxHealth}. Description: ${currentThreat.description}. Senses: ${currentThreat.senses?.join(', ') || 'Undefined'}.`;
  }

  let memoryLogString = "Recent Events Log: (No recent events logged yet or log is empty)";
  if (memoryLog.length > 0) {
    memoryLogString = "Recent Events Log:\n" + memoryLog.map((entry, index) => `${index + 1}. ${entry}`).join("\n");
  }

  let storyFlagsString = "Current Story Flags: (None active)";
  if (Object.keys(currentStoryFlags).length > 0) {
    storyFlagsString = "Current Story Flags:\n" + Object.entries(currentStoryFlags).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join("\n");
  }

  let playerAbilitiesString = "Active Player Abilities: (None active)";
  if (currentPlayerAbilities.length > 0) {
    playerAbilitiesString = "Active Player Abilities:\n" + currentPlayerAbilities.map(ability => `- ${ability.name} (${ability.uses !== undefined ? ability.uses + ' use(s) left' : 'Ongoing/Passive'}): ${ability.description}`).join("\n");
  }

  const systemMemoryLogString = '[SYSTEM MEMORY LOG]\n' + JSON.stringify(systemMemoryLog, null, 2);

  const prompt = `
Context:
Scenario Theme: ${scenarioTheme}
Player Health: ${playerHealth}
Is In Combat: ${isInCombat}
Player is initiating combat this turn via choice: ${isInitiatingCombatByChoice}
Previous scene: "${previousScene}"
Player chose: "${playerChoiceText}"
Current inventory: ${inventoryString}
${threatContextString}
${memoryLogString}
${systemMemoryLogString}
${storyFlagsString}
${playerAbilitiesString}

Based on this, generate the next part of the story or combat turn.
Follow ALL system instructions regarding scene description, choices (including 'triggersCombat' flags if 'imminent'), combat (if 'engaged', 'isInitiatingCombatByChoice' is true, or AI narrative dictates an attack'), inventory items, persistent pursuer, "Recent Events Log", "Current Story Flags", "Active Player Abilities", and "Emergent Gameplay Effects".
Crucially, use the "Recent Events Log", "Current Story Flags", and "Active Player Abilities" to maintain continuity and inform your generation of events and potential new gameplayEffects.
Provide a "memoryLogSummary" for the current turn.
If combat is occurring or starting, provide "combatOutcome" and "combatChoices".
Otherwise, provide standard "sceneDescription" and "choices".`;

  const MAX_ATTEMPTS = 2;
  let attempts = 0;
  let lastError: Error | undefined;
  let apiCallResponse: GenerateContentResponse | undefined;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    apiCallResponse = undefined; // Reset for each attempt
    try {
      apiCallResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: GEMINI_SYSTEM_INSTRUCTION_JSON,
          maxOutputTokens: 8000,
        },
      });
      const responseText = apiCallResponse.text;
      if (!responseText) {
          throw new Error(`Received empty response text from Gemini API for next segment on attempt ${attempts}.`);
      }
      return parseGeminiJsonResponse<GeminiApiResponse>(responseText); // Success
    } catch (err) {
      lastError = err as Error;
      console.error(`Attempt ${attempts} failed for next story segment:`, err);
      if (apiCallResponse) {
        console.error("Gemini API Diagnostic Info (Next Story Segment - Attempt ${attempts}):");
        console.error("  Finish Reason:", apiCallResponse.candidates?.[0]?.finishReason);
        console.error("  Safety Ratings:", JSON.stringify(apiCallResponse.candidates?.[0]?.safetyRatings, null, 2));
        if (apiCallResponse.promptFeedback) {
          console.error("  Prompt Feedback:", JSON.stringify(apiCallResponse.promptFeedback, null, 2));
        }
        console.error(`Raw response text on failed attempt ${attempts} (Next Story Segment):\n${apiCallResponse.text?.substring(0,1000) || "N/A"}`);
      } else {
         console.error(`Raw response text was unavailable on failed attempt ${attempts} (Next Story Segment).`);
      }


      if (attempts >= MAX_ATTEMPTS) {
        console.error(`All ${MAX_ATTEMPTS} attempts failed for next story segment. Rethrowing last error.`);
        throw lastError;
      }
      console.warn(`Retrying API call for next story segment (attempt ${attempts + 1} of ${MAX_ATTEMPTS})...`);
    }
  }
  // Fallback, should ideally be caught by the rethrow in the loop
  throw lastError || new Error("All API call attempts for next story segment failed.");
};