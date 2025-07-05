"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import useSocket from '@/hooks/useSocket'; // Using the new hook

// Dynamically import the PhaserGame component with SSR turned off
const PhaserGameNoSSR = dynamic(
  () => import('@/app/components/PhaserGame'), // Path to your Phaser game component
  {
    ssr: false, // This is crucial
    loading: () => <p style={{ textAlign: 'center' }}>Loading Game...</p> // Optional loading indicator
  }
);

export default function GamePage() {
  const socket = useSocket('http://localhost:4242');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="mb-5 text-3xl font-bold text-center">My Phaser Game in Next.js</h1>
      {/* Render PhaserGame only when the socket is connected */}
      {socket ? <PhaserGameNoSSR socketIo={socket} clientId={1}/> : <p>Connecting to game server...</p>}
      <p className="mt-5 text-gray-700 dark:text-gray-300">This page is a JavaScript React component (.jsx).</p>
      <p className="text-gray-600 dark:text-gray-400">The Phaser game itself is a TypeScript component (.tsx), now loaded dynamically.</p>
    </div>
  );
}
