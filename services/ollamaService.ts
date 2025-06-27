import { GEMINI_SYSTEM_INSTRUCTION_JSON, INITIAL_GAME_PROMPT_JSON } from '../constants';
import { GeminiApiResponse, PersistentThreat } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gemma3:4b'; // Using Gemma 3 4B model for better GPU support

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const requestBody = {
    model: MODEL_NAME,
    prompt: prompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: 0.8,
      top_p: 0.9,
      num_ctx: 8192, // Context length optimized for GPU
      num_gpu: -1, // Use all available GPU layers
      num_thread: 1, // Reduce CPU threads to favor GPU
      use_mlock: true, // Lock memory for better performance
    }
  };

  console.log('Calling Ollama with prompt:', prompt.substring(0, 200) + '...');

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    console.log('Raw Ollama response:', data.response);
    return data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw new Error(`Failed to call Ollama: ${error}`);
  }
}

function parseOllamaJsonResponse<T>(responseText: string): T {
  // Remove any markdown code fences
  let cleanText = responseText.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '');
  
  // Try to find JSON within the response
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  try {
    console.log('Attempting to parse JSON:', cleanText.substring(0, 500) + '...');
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error('JSON parsing failed:', error);
    console.error('Raw response text:', responseText);
    throw new Error(`Failed to parse Ollama response as JSON: ${error}`);
  }
}

export interface InitialStoryData extends GeminiApiResponse {
}

export const fetchInitialStory = async (selectedTheme: string, systemMemoryLog: any): Promise<InitialStoryData> => {
  const systemMemoryLogString = '[SYSTEM MEMORY LOG]\n' + JSON.stringify(systemMemoryLog, null, 2);
  const themedInitialPromptJson = INITIAL_GAME_PROMPT_JSON.replace(
    "[SCENARIO_THEME_PLACEHOLDER]",
    selectedTheme
  ) + '\n' + systemMemoryLogString;

  console.log('Prompt sent to Ollama in fetchInitialStory:', themedInitialPromptJson);

  const MAX_ATTEMPTS = 3;
  let attempts = 0;
  let lastError: Error | undefined;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const responseText = await callOllama(themedInitialPromptJson, GEMINI_SYSTEM_INSTRUCTION_JSON);
      
      if (!responseText) {
        throw new Error(`Received empty response text from Ollama for initial story on attempt ${attempts}.`);
      }

      const parsedResponse = parseOllamaJsonResponse<GeminiApiResponse>(responseText);
      console.log('Parsed Ollama response for initial story:', parsedResponse);
      return parsedResponse as InitialStoryData;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempts} failed for initial story:`, lastError.message);
      
      if (attempts >= MAX_ATTEMPTS) {
        console.error('All attempts failed for initial story. Last error:', lastError.message);
        throw new Error(`Failed to get initial story after ${MAX_ATTEMPTS} attempts. Last error: ${lastError.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  throw lastError || new Error('Unknown error occurred while fetching initial story.');
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
  const systemMemoryLogString = '[SYSTEM MEMORY LOG]\n' + JSON.stringify(systemMemoryLog, null, 2);
  
  const promptData = {
    previousScene,
    playerChoice: playerChoiceText,
    inventory,
    playerHealth,
    currentThreat,
    isInCombat,
    isInitiatingCombatByChoice,
    memoryLog: memoryLog.slice(-10), // Keep last 10 entries
    currentStoryFlags,
    currentPlayerAbilities,
    scenarioTheme,
    systemMemoryLog: systemMemoryLogString
  };

  const prompt = `Continue the story based on the following game state:

Previous Scene: ${previousScene}

Player Choice: ${playerChoiceText}

Game State:
- Health: ${playerHealth}/100
- Inventory: ${inventory.length > 0 ? inventory.join(', ') : 'Empty'}
- Current Threat: ${currentThreat ? `${currentThreat.name} (Health: ${currentThreat.currentHealth}/${currentThreat.maxHealth})` : 'None'}
- In Combat: ${isInCombat}
- Initiating Combat: ${isInitiatingCombatByChoice}
- Story Flags: ${JSON.stringify(currentStoryFlags)}
- Player Abilities: ${currentPlayerAbilities.map(a => `${a.name}${a.uses !== undefined ? ` (${a.uses} uses)` : ''}`).join(', ')}

Recent Memory: ${memoryLog.slice(-5).join(' | ')}

Scenario Theme: ${scenarioTheme}

${systemMemoryLogString}

Please respond with a JSON object containing the next story segment, choices, and any game state updates.`;

  console.log('Prompt sent to Ollama in fetchNextStorySegment:', prompt);

  const MAX_ATTEMPTS = 3;
  let attempts = 0;
  let lastError: Error | undefined;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const responseText = await callOllama(prompt, GEMINI_SYSTEM_INSTRUCTION_JSON);
      
      if (!responseText) {
        throw new Error(`Received empty response text from Ollama for next story segment on attempt ${attempts}.`);
      }

      const parsedResponse = parseOllamaJsonResponse<GeminiApiResponse>(responseText);
      console.log('Parsed Ollama response for next story segment:', parsedResponse);
      return parsedResponse;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempts} failed for next story segment:`, lastError.message);
      
      if (attempts >= MAX_ATTEMPTS) {
        console.error('All attempts failed for next story segment. Last error:', lastError.message);
        throw new Error(`Failed to get next story segment after ${MAX_ATTEMPTS} attempts. Last error: ${lastError.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  throw lastError || new Error('Unknown error occurred while fetching next story segment.');
};

// Health check function
export const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    console.error('Ollama connection check failed:', error);
    return false;
  }
};

// Get available models
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.models?.map((model: any) => model.name) || [];
  } catch (error) {
    console.error('Failed to get available models:', error);
    return [];
  }
}; 