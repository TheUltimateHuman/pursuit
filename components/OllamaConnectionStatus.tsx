import React, { useState, useEffect } from 'react';
import { checkOllamaConnection, getAvailableModels } from '../services/ollamaService';

interface OllamaConnectionStatusProps {
  onConnectionChange?: (connected: boolean) => void;
}

const OllamaConnectionStatus: React.FC<OllamaConnectionStatusProps> = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await checkOllamaConnection();
      setIsConnected(connected);
      
      if (connected) {
        const models = await getAvailableModels();
        setAvailableModels(models);
      } else {
        setAvailableModels([]);
      }
      
      onConnectionChange?.(connected);
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
      setAvailableModels([]);
      onConnectionChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isChecking) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid #ccc',
            borderTop: '2px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Checking Ollama...
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: isConnected ? 'rgba(220, 252, 231, 0.95)' : 'rgba(254, 226, 226, 0.95)',
      border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '200px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isConnected ? '#10b981' : '#ef4444'
        }} />
        <strong>Ollama {isConnected ? 'Connected' : 'Disconnected'}</strong>
      </div>
      
      {isConnected ? (
        <div style={{ fontSize: '12px', color: '#374151' }}>
          <div>Available models: {availableModels.length}</div>
          {availableModels.length > 0 && (
            <div style={{ marginTop: '4px', fontFamily: 'monospace' }}>
              {availableModels.slice(0, 3).map(model => (
                <div key={model} style={{ opacity: 0.7 }}>• {model}</div>
              ))}
              {availableModels.length > 3 && (
                <div style={{ opacity: 0.7 }}>• ... and {availableModels.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          <div>Make sure Ollama is running on localhost:11434</div>
          <button 
            onClick={checkConnection}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              fontSize: '12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default OllamaConnectionStatus; 