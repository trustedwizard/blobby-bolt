import React from 'react';
import { Game } from './components/Game';
import { StartScreen } from './components/StartScreen';
import { useGameStore } from './store/gameStore';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { gameStarted } = useGameStore();

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen overflow-hidden bg-black">
        {gameStarted ? <Game /> : <StartScreen />}
      </div>
    </ErrorBoundary>
  );
}

export default App;