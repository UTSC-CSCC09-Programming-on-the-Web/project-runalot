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
  // Pass roomId and clientId in the socket query for the backend to use.
  const socket = useSocket('http://localhost:4242', { roomId: '1', clientId: '1' });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="mb-5 text-3xl font-bold text-center">Ready, Set, TAG!</h1>
      {/* Render PhaserGame only when the socket is connected */}
      {socket ? <PhaserGameNoSSR socketIo={socket} clientId="1" roomId="1"/> : <p>Connecting to game server...</p>}
    </div>
  );
}
