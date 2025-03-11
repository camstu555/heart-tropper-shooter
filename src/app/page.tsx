'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import StartScreen from '../components/StartScreen';

// Dynamically import the Game component with no SSR
const Game = dynamic(() => import('../components/Game'), { ssr: false });

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      {!gameStarted ? (
        <StartScreen onStartGame={handleStartGame} />
      ) : (
        <Game />
      )}
    </main>
  );
}
