import React, { useState, useEffect } from 'react';
import { GameLogEntry, gameLogService } from '../services/gameLogService';

interface GameLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameLogModal: React.FC<GameLogModalProps> = ({ isOpen, onClose }) => {
  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<GameLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGameLogs();
    }
  }, [isOpen]);

  const loadGameLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await gameLogService.getGameLogs();
      setGameLogs(logs.sort((a, b) => b.timestamp - a.timestamp)); // Most recent first
    } catch (error) {
      console.error('Failed to load game logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game log?')) return;
    
    try {
      await gameLogService.deleteGameLog(id);
      setGameLogs(prev => prev.filter(log => log.id !== id));
      if (selectedLog?.id === id) {
        setSelectedLog(null);
      }
    } catch (error) {
      console.error('Failed to delete game log:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL game logs? This cannot be undone.')) return;
    
    try {
      await gameLogService.clearAllLogs();
      setGameLogs([]);
      setSelectedLog(null);
    } catch (error) {
      console.error('Failed to clear game logs:', error);
    }
  };

  const getGameEndStatus = (log: GameLogEntry) => {
    if (!log.gameEndType || log.gameEndType === 'ongoing') return 'In Progress';
    switch (log.gameEndType) {
      case 'player_defeat': return 'Defeat';
      case 'pursuer_combat_defeat': return 'Combat Defeat';
      case 'alternate_win': return 'Victory';
      case 'alternate_loss': return 'Loss';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (log: GameLogEntry) => {
    if (!log.gameEndType || log.gameEndType === 'ongoing') return 'text-yellow-400';
    switch (log.gameEndType) {
      case 'player_defeat':
      case 'pursuer_combat_defeat':
      case 'alternate_loss': return 'text-red-400';
      case 'alternate_win': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 p-6 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Game Logs</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleClearAll}
              disabled={gameLogs.length === 0}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Game Logs List */}
          <div className="w-1/3 bg-gray-700 rounded p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Saved Games</h3>
            {isLoading ? (
              <div className="text-gray-300">Loading...</div>
            ) : gameLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No saved games found
              </div>
            ) : (
              <div className="space-y-2">
                {gameLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded cursor-pointer border transition-colors ${
                      selectedLog?.id === log.id
                        ? 'bg-gray-600 border-yellow-400'
                        : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-white text-sm">
                        {gameLogService.getScenarioDisplayName(log.scenario)}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">
                      {gameLogService.formatTimestamp(log.timestamp)}
                    </div>
                    <div className={`text-xs font-medium ${getStatusColor(log)}`}>
                      {getGameEndStatus(log)} • {log.totalTurns} turns
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Story Log Display */}
          <div className="w-2/3 bg-gray-700 rounded p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Story Log</h3>
            {selectedLog ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Scenario</h4>
                  <p className="text-gray-300 text-sm">{selectedLog.scenario}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Status</h4>
                  <p className={`text-sm font-medium ${getStatusColor(selectedLog)}`}>
                    {getGameEndStatus(selectedLog)}
                  </p>
                  {selectedLog.gameOverSummary && (
                    <p className="text-gray-300 text-sm mt-1">{selectedLog.gameOverSummary}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Final Stats</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>Health: {selectedLog.finalHealth}/{selectedLog.finalMaxHealth}</div>
                    <div>Total Turns: {selectedLog.totalTurns}</div>
                    <div>Items: {selectedLog.finalInventory.length}</div>
                    <div>Abilities: {selectedLog.playerAbilities.length}</div>
                  </div>
                </div>

                {selectedLog.finalInventory.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">Final Inventory</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      {selectedLog.finalInventory.map((item, index) => (
                        <div key={index}>
                          {item.quantity > 1 ? `${item.quantity} ${item.name}` : item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.playerAbilities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">Abilities</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      {selectedLog.playerAbilities.map((ability, index) => (
                        <div key={index} title={ability.description}>
                          {ability.name}
                          {ability.uses !== undefined && ` (${ability.uses} uses)`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-white mb-2">Complete Story</h4>
                  <div className="text-sm text-gray-300 space-y-3 max-h-96 overflow-y-auto bg-gray-800 p-4 rounded border border-gray-600">
                    {selectedLog.storyLog.map((entry, index) => (
                      <div key={index} className="whitespace-pre-line leading-relaxed">
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                Select a game to view the complete story
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLogModal; 