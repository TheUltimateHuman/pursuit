export interface GameLogEntry {
  id: string;
  timestamp: number;
  scenario: string;
  gameEndType?: 'player_defeat' | 'pursuer_combat_defeat' | 'alternate_win' | 'alternate_loss' | 'ongoing';
  gameOverSummary?: string;
  storyLog: string[]; // Single comprehensive story log
  finalInventory: Array<{ name: string; quantity: number }>;
  finalHealth: number;
  finalMaxHealth: number;
  playerAbilities: Array<{ name: string; description: string; uses?: number }>;
  storyFlags: Record<string, any>;
  totalTurns: number;
  sessionId: string; // Add session ID to track current game
}

class GameLogService {
  private dbName = 'PursuitGameLogs';
  private dbVersion = 1;
  private storeName = 'gameLogs';
  private db: IDBDatabase | null = null;
  private currentSessionId: string | null = null;

  async init(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage');
        resolve();
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
  }

  // Start a new game session
  startNewSession(): string {
    this.currentSessionId = this.generateId();
    return this.currentSessionId;
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  async saveGameLog(gameLog: Omit<GameLogEntry, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    const sessionId = this.currentSessionId || this.generateId();
    this.currentSessionId = sessionId;

    const entry: GameLogEntry = {
      ...gameLog,
      id: sessionId, // Use session ID as the primary key
      timestamp: Date.now(),
      sessionId: sessionId
    };

    if (this.db) {
      // Use IndexedDB - this will replace existing entry with same ID
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(entry);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage - replace existing entry
      const logs = this.getLogsFromLocalStorage();
      const existingIndex = logs.findIndex(log => log.sessionId === sessionId);
      
      if (existingIndex >= 0) {
        logs[existingIndex] = entry;
      } else {
        logs.push(entry);
      }
      
      this.saveLogsToLocalStorage(logs);
    }
  }

  async getGameLogs(): Promise<GameLogEntry[]> {
    if (this.db) {
      // Use IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage
      return this.getLogsFromLocalStorage();
    }
  }

  async deleteGameLog(id: string): Promise<void> {
    if (this.db) {
      // Use IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage
      const logs = this.getLogsFromLocalStorage();
      const filteredLogs = logs.filter(log => log.id !== id);
      this.saveLogsToLocalStorage(filteredLogs);
    }
  }

  async clearAllLogs(): Promise<void> {
    if (this.db) {
      // Use IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage
      localStorage.removeItem('pursuit_game_logs');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getLogsFromLocalStorage(): GameLogEntry[] {
    try {
      const stored = localStorage.getItem('pursuit_game_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveLogsToLocalStorage(logs: GameLogEntry[]): void {
    try {
      localStorage.setItem('pursuit_game_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getScenarioDisplayName(scenario: string): string {
    // Remove prefix and clean up the scenario name
    return scenario.replace(/^(REALISM|Historical|Science Fiction|Fantasy|Mythological|Contemporary):\s*/i, '');
  }
}

export const gameLogService = new GameLogService(); 