import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import { ErrorBoundary } from './components/ErrorBoundary';
import { socketService } from './services/socket';

function App() {
  const player = useGameStore(state => state.player);

  useEffect(() => {
    // Initialize socket connection when app starts
    const initSocket = async () => {
      try {
        await socketService.connect();
      } catch (error) {
        console.error('Failed to connect to server:', error);
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden">
        {player ? <Game /> : <StartScreen />}
      </div>
    </ErrorBoundary>
  );
}

export default App;