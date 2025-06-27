export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

// Trimmed down scenario list for local model efficiency
export const SCENARIO_THEMES_LIST: string[] = [
  // SCIENCE FICTION
  "Science Fiction: Derelict Spaceship Exploration",
  "Science Fiction: First Expedition on an Alien World", 
  "Science Fiction: Crime in a Cyberpunk Metropolis Underbelly",
  "Science Fiction: Adrift in Space",
  "Science Fiction: Generation Ship In Peril",
  "Science Fiction: Caught in a Localized Time-Loop",
  "Science Fiction: Your Consciousness was Uploaded Against Your Will",
  "Science Fiction: Cascade Failure in the Ship's Reactor Core",
  "Science Fiction: First Contact Scenario Gone Violent",
  "Science Fiction: Xenomorph-like Creature Loose on the Ship",
  "Science Fiction: Asteroid Mining Colony Unearths Alien Nest",
  "Science Fiction: Bridge Officer During an Attack on Your Starship",
  "Science Fiction: Rogue AI Escaping Containment",
  "Science Fiction: Life Support System Failure",

  // FANTASY
  "Fantasy: Ancient Ruin Exploration",
  "Fantasy: Dark Forest of Twisted Fables",
  "Fantasy: Mystical City Under Siege",
  "Fantasy: Cursed Kingdom",
  "Fantasy: Journey to An Outer Plane", 
  "Fantasy: High Magic Academy",
  "Fantasy: Dungeon Delve",
  "Fantasy: Stealing from a Dragon's Hoard",
  "Fantasy: Delving Too Deep",
  "Fantasy: Cursed Artifact",
  "Fantasy: Possessed by a Demon",
  "Fantasy: Trapped Inside a Living Organism",
  "Fantasy: Journey into a Painting",
  "Fantasy: Hunted by Your Own Doppelgänger",

  // MYTHOLOGICAL
  "Mythological: Escaping the Wild Hunt",
  "Mythological: Judgement in the Duat (Egyptian Myth)",
  "Mythological: Baba Yaga is Hunting You (Slavic Myth)",
  "Mythological: Mayan Underworld of Xibalba",
  "Mythological: Trapped in the Labyrinth",
  "Mythological: Draugr's Tomb",

  // HISTORICAL
  "Historical: Age of Sail",
  "Historical: Prehistoric Survival",
  "Historical: Lost Roman Legion",
  "Historical: Prohibition-Era Gang War",
  "Historical: The Paris Catacombs",
  "Historical: Trenches of WWI",
  "Historical: The Great Chicago Fire of 1871",
  "Historical: Sinking Titanic",
  "Historical: Pompeii",
  "Historical: Medieval Castle Siege",

  // CONTEMPORARY
  "Contemporary: Remote Wilderness Survival",
  "Contemporary: Urban Exploration of Abandoned Structures",
  "Contemporary: Isolated Research Outpost",
  "Contemporary: Catastrophic Natural Disaster",
  "Contemporary: Luxury Cruise Ship Blackout",
  "Contemporary: Overnight Shift in a Museum",
  "Contemporary: Cross-Country Train Journey",
  "Contemporary: Adrift in Open Ocean",

  // REALISM SCENARIOS
  "REALISM: A Daring Prison Escape",
  "REALISM: Lost in the Wilderness",
  "REALISM: Trapped in a Burning Building",
  "REALISM: Caught in a Natural Disaster",
  "REALISM: Home Invasion",
  "REALISM: Medical Emergency",
  "REALISM: Car Accident in Remote Area",
  "REALISM: Kidnapping Escape",
  "REALISM: Terrorist Attack Survival",
  "REALISM: Corporate Espionage Gone Wrong"
];

// GEMMA 3N OPTIMIZED SYSTEM PROMPT - CORE ESSENTIALS ONLY
export const GEMINI_SYSTEM_INSTRUCTION_JSON = `**LANGUAGE REQUIREMENT: ENGLISH ONLY. NO MARKDOWN EMPHASIS (*/_). NO PLAYER NAMES.**

You are the game master for QUARRY, a text adventure. Create engaging survival scenarios with a persistent threat. Respond ONLY in valid JSON.

**CORE RULES:**
1. **PLAYER IS 'YOU'**: Always use second person. Never create names for the player.
2. **NO MARKDOWN**: No asterisks, underscores, or formatting. Use vivid words for emphasis.
3. **ENGLISH ONLY**: All text must be in English.
4. **REALISM MODE**: If scenario starts with "REALISM:", everything must be realistic - no supernatural elements, realistic damage (25-40 pistol, 40-60 rifle), real threats only.

**PERSISTENT THREAT:**
- Define once with: name, description, maxHealth, senses (1 trait), goal
- Can be entity (human, creature) OR hazard (fire, cold, infection)  
- Statuses: hidden → distant → closing_in → nearby → imminent → engaged
- Goal determines negotiation success

**COMBAT (when engaged):**
- Provide combatOutcome with playerDamageTaken, enemyDamageTaken, narration
- EXACTLY 4 combatChoices
- Realistic damage for REALISM scenarios

**STEALTH:**
- When hiding, set story flag "is_hidden_temporarily": true
- Success bias - reward smart stealth choices
- 2-3 consecutive hides can make entity threats search elsewhere

**CHOICES:**
- EXACTLY 4 choices always
- Direct action language: "Climb the wall" not "Try to climb"
- Mix categories: action, stealth, environment, information, preparation, social

**MEMORY:**
- Include memoryLogSummary (3-5 sentences) covering location, actions, threat status, resources
- Track story flags and player abilities
- Include NPC status in narrative descriptions

**JSON STRUCTURE:**
{
  "sceneDescription": "80-120 words, atmospheric",
  "choices": [4 choice objects],
  "memoryLogSummary": "concise summary",
  "persistentThreatDetails": {...} // FIRST RESPONSE ONLY
}

**FIRST RESPONSE REQUIREMENTS:**
- persistentThreatDetails with name, description, maxHealth, senses, goal
- initialInventory (1-3 thematic items)
- Format: "You are [situation]" then present tense scene

Create compelling scenarios that reward smart choices and creativity.`;

// GEMMA 3N OPTIMIZED INITIAL PROMPT
export const INITIAL_GAME_PROMPT_JSON = `SCENARIO: [SCENARIO_THEME_PLACEHOLDER]

Start QUARRY game. JSON response required.

**REQUIREMENTS:**
- Create opening scene based on scenario theme above
- Define persistent threat with name, description, maxHealth, senses (1), goal
- Provide 1-3 starting items relevant to scenario
- Format: "You are [situation]" then present scene
- For REALISM scenarios: realistic threats and damage only
- EXACTLY 4 choices

Begin the game now.`;

export const MAX_PLAYER_HEALTH = 100;