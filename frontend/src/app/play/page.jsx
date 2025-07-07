"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import useSocket from '@/hooks/useSocket';
import dotenv from 'dotenv';
import { useAuth } from '../contexts/AuthContext';

dotenv.config();

// Dynamically import the PhaserGame component with SSR turned off
const PhaserGameNoSSR = dynamic(
  () => import('@/app/components/PhaserGame'), // Path to your Phaser game component
  {
    ssr: false, // This is crucial
    loading: () => <p style={{ textAlign: 'center' }}>Loading Game...</p> // Optional loading indicator
  }
);

export default function GamePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
        <img src="/assets/icon/error.svg" alt="Error" className="w-20 h-20 mb-4" />
        <h1 className="mb-4 text-3xl font-bold text-center">Please log in to play!</h1>
        <p className="text-center text-gray-700">You need to be logged in to access the game.</p>
      </div>
    );
  }

  return <Game user={user} />;
}

function Game({ user }) {
  const socket = useSocket(process.env.NEXT_PUBLIC_BACKEND_URL, { roomId: '1', clientId: user.id });

  const handleStartGame = () => {
    if (socket) {
      console.log('Starting game for user:', socket);
      socket.emit('startGame');
      console.log('Game started by client:', user.id);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="mb-5 text-3xl font-bold text-center">Ready, Set, TAG!</h1>
      {/* Game Start Button */}
      <button
        onClick={handleStartGame}
        className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
      >
        Start Game
      </button>
      {/* Render PhaserGame only when the socket is connected */}
      {socket ? <PhaserGameNoSSR socketIo={socket} clientId={user.id} roomId="1"/> : <p>Connecting to game server...</p>}
    </div>
  );
}
