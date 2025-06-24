# Persistent Threat UI Update

## Overview
The persistent threat display UI has been updated to remove immersion-breaking elements and simplify the interface. The threat name display and senses section have been removed, and the redaction system has been eliminated.

## Changes Made

### 1. UI Component Updates (`components/PersistentThreatDisplay.tsx`)
- **Removed threat name display**: The "THREAT: [name]" header has been completely removed
- **Removed senses section**: The senses display with eye icons has been eliminated
- **Removed redaction features**: All redaction-related code and styling has been removed
- **Simplified layout**: The UI now only shows:
  - Status description message (if available)
  - Visual position indicator (the colored bars)
  - Health bar (when applicable)
  - Combat warnings (when engaged)

### 2. Data Structure Updates (`types.ts`)
- **Removed redacted field**: The `redacted?: boolean` field has been removed from the `PersistentThreat` interface
- **Maintained core fields**: All other fields (name, description, status, health, senses, lastKnownAction) remain intact

### 3. Application Logic Updates (`App.tsx`)
- **Removed redaction handling**: The code that set the `redacted` field has been removed
- **Simplified threat creation**: The persistent threat object creation no longer includes redaction logic

### 4. LLM Instructions Updates (`constants.ts`)
- **Removed redaction system**: The entire "THREAT REDACTION SYSTEM" section has been removed
- **Updated naming guidance**: Added "PERSISTENT THREAT NAMING GUIDANCE" that makes naming less mandatory
- **Flexible naming approach**: The instructions now emphasize that the threat's behavior and impact are more important than its label

## Benefits

### 1. Improved Immersion
- No more "THREAT: [name]" labels breaking the narrative flow
- Focus on the threat's behavior rather than its label
- More natural storytelling experience

### 2. Simplified Interface
- Cleaner, less cluttered UI
- Easier to read and understand
- More focused on essential information

### 3. Reduced Complexity
- Eliminated the redaction system complexity
- Simplified LLM instructions
- Easier to maintain and debug

## Technical Details

### UI Layout Changes
The persistent threat display now uses a simpler structure:
```tsx
<div className="threat-display">
  {displayMessage && <p>"{displayMessage}"</p>}
  <div className="visual-indicator">
    {/* Position bars */}
  </div>
  {healthBar && <div className="health-bar" />}
</div>
```

### Data Flow
- The threat name is still tracked internally for system purposes
- The name may be referenced in narrative when appropriate
- The focus is on the threat's behavior and impact rather than its label

### LLM Behavior
- LLMs are no longer strictly required to name threats
- Names should be descriptive and scenario-appropriate
- The emphasis is on creating compelling threats rather than labeling them

## Migration Notes
- Existing games will continue to work normally
- The threat name is still available internally for any future features
- No breaking changes to the core game mechanics
- All other UI elements (inventory, choices, etc.) remain unchanged 