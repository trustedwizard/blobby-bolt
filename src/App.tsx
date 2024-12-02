import React from 'react';
import { useGameStore } from './store/gameStore';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const player = useGameStore(state => state.player);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden">
        {player ? <Game /> : <StartScreen />}
      </div>
    </ErrorBoundary>
  );
}

export default App;