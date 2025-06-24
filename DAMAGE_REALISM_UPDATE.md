# Damage Realism Update for REALISM Mode

## Overview
The LLM instructions have been updated to ensure realistic damage values in REALISM mode scenarios. This addresses the issue where the LLM might artificially limit damage to keep players alive, which breaks immersion in realistic scenarios.

## Key Changes Made

### 1. Enhanced REALISM Directive
Added a critical damage realism requirement to the REALISM scenario directive:
- **DAMAGE REALISM (CRITICAL)**: All combat damage MUST be realistic and appropriate to the actual threat and weaponry involved
- **NO artificial damage caps or limitations**
- **Realistic damage examples provided** for different threat types

### 2. Detailed Combat Damage Instructions
Added comprehensive damage guidelines in the combat mechanics section:
- **REALISTIC DAMAGE VALUES FOR REALISM MODE**: Specific damage ranges for different weapon types
- **NO DAMAGE LIMITATIONS**: Explicit instruction not to artificially limit damage
- **DAMAGE SCALING**: Damage should scale with threat capabilities and weaponry

### 3. Updated Final Reminder
Enhanced the final reminder to emphasize damage realism in REALISM scenarios.

## Realistic Damage Examples

### Firearms
- **Pistol shots**: 15-25 damage
- **Rifle shots**: 25-40 damage  
- **Shotgun blasts**: 30-50 damage
- **Multiple hits**: Cumulative damage

### Bladed Weapons
- **Knife wounds**: 10-20 damage
- **Machete strikes**: 20-35 damage
- **Multiple cuts**: Cumulative damage

### Blunt Force
- **Fists**: 5-15 damage
- **Clubs/bats**: 15-30 damage
- **Falls**: 10-25 damage

### Animal Attacks
- **Bear claws**: 25-45 damage
- **Wolf bites**: 15-25 damage
- **Snake venom**: 20-35 damage per turn

### Environmental Hazards
- **Fire burns**: 20-40 damage
- **Drowning**: 30-50 damage
- **Hypothermia**: 10-20 damage per turn

## Critical Principles

### 1. No Artificial Limitations
- Do not artificially limit damage to keep the player alive
- If a realistic attack would be lethal, damage should reflect this reality
- Player survival should depend on choices and luck, not damage caps

### 2. Appropriate Scaling
- Damage should scale with threat capabilities and weaponry
- A trained assassin with a high-powered rifle should be able to deliver lethal damage
- An unarmed civilian might cause minimal damage

### 3. Cumulative Effects
- Multiple injuries should have realistic cumulative effects
- Multiple gunshot wounds, severe trauma, or compound injuries should be potentially lethal

## Impact on Gameplay

### Enhanced Realism
- REALISM scenarios now feel genuinely dangerous
- Players must be more strategic about avoiding combat
- Consequences of poor choices are more severe

### Improved Immersion
- Damage values match real-world expectations
- No "plot armor" protecting players from realistic consequences
- Tension and stakes are significantly increased

### Better Balance
- Players are incentivized to use stealth, negotiation, and smart tactics
- Combat becomes a last resort rather than a viable primary strategy
- Resource management becomes more critical

## Examples of Realistic Scenarios

### Scenario: "REALISM: A Daring Prison Escape"
- **Guard with pistol**: 15-25 damage per shot
- **Multiple guards**: Cumulative damage from multiple sources
- **Falls from walls**: 10-25 damage depending on height
- **Barbed wire**: 5-15 damage per contact

### Scenario: "REALISM: Hunted by Drug Cartel Enforcers"
- **Assault rifle**: 25-40 damage per shot
- **Multiple shooters**: Potentially lethal cumulative damage
- **Vehicle collision**: 30-50 damage
- **Explosive devices**: 40-60+ damage

### Scenario: "REALISM: Stalked by a Bear"
- **Bear claw swipe**: 25-45 damage
- **Bear bite**: 30-50 damage
- **Multiple attacks**: Rapid health depletion
- **Environmental hazards**: Additional damage from terrain

## Benefits

1. **Authentic Experience**: REALISM scenarios now deliver on their promise of realistic danger
2. **Strategic Depth**: Players must think carefully about engagement
3. **Tension**: Genuine fear of consequences increases immersion
4. **Variety**: Different threats pose different realistic dangers
5. **Consequences**: Poor choices have meaningful, realistic outcomes

## Implementation Notes

- These changes only apply to scenarios starting with "REALISM:"
- Other scenario types (Fantasy, Sci-Fi, etc.) maintain their existing damage systems
- The LLM will now provide realistic damage values without artificial limitations
- Player survival depends more on smart choices and tactical thinking 