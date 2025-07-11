"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '@/hooks/useSocket';
import dynamic from 'next/dynamic';
import dotenv from 'dotenv';

dotenv.config();

// Dynamically import the PhaserGame component with SSR turned off
const PhaserGameNoSSR = dynamic(
  () => import('@/app/components/PhaserGame'),
  {
    ssr: false,
    loading: () => <p style={{ textAlign: 'center' }}>Loading Game...</p>
  }
);

export default function WaitingRoom() {
  const { user, loading } = useAuth();
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'ready', 'playing'
  const [roomId, setRoomId] = useState('');
  const [playersInRoom, setPlayersInRoom] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [socket, setSocket] = useState(null);
  const [clientId, setClientId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isWaitingForRoomCreation, setIsWaitingForRoomCreation] = useState(false);


  // Generate client ID from user info
  useEffect(() => {
    if (user) {
      const id = user.id || user.login || user.email || `user_${Date.now()}`;
      setClientId(id);
    }
  }, [user]);

  // Initialize socket when we have roomId and clientId
  const socketConnection = useSocket(
    roomId && clientId ? process.env.NEXT_PUBLIC_BACKEND_URL : null,
    roomId && clientId ? { roomId, clientId } : null
  );

  useEffect(() => {
    if (socketConnection && roomId && clientId) {
      setSocket(socketConnection);
      
      // Listen for room updates
      socketConnection.on('roomUpdate', (data) => {
        setPlayersInRoom(data.players || []);
        setIsHost(data.host === clientId);
        // Room creation successful if we receive room update while waiting
        if (isWaitingForRoomCreation) {
          setIsWaitingForRoomCreation(false);
          setGameState('ready');
        }
      });

      // Listen for game start
      socketConnection.on('gameStart', () => {
        setGameState('playing');
      });

      // Listen for player join/leave
      socketConnection.on('playerJoined', (data) => {
        console.log(`Player ${data.playerId} joined the room`);
      });

      socketConnection.on('playerLeft', (data) => {
        console.log(`Player ${data.playerId} left the room`);
      });

      // Listen for room join errors
      socketConnection.on('roomJoinError', (data) => {
        console.error('Room join error:', data.error);
        setErrorMessage(data.message || 'Failed to join room');
        // Reset to waiting state
        setGameState('waiting');
        setRoomId('');
        setPlayersInRoom([]);
        setIsHost(false);
        setSocket(null);
      });

      // Now emit joinWaitingRoom AFTER socket is set up
      socketConnection.emit('joinWaitingRoom', {
        roomId,
        clientId,
        playerName: user?.displayName || user?.name || 'Anonymous',
        isCreating: isCreatingRoom
      });
    }
  }, [socketConnection, roomId, clientId, user, isCreatingRoom]);

  const createRoom = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/create-room`, {
      method: 'GET',
      credentials: 'include'
    });
    if(!response.ok) {
      setErrorMessage('Failed to create room');
      setGameState('waiting');
      setRoomId('');
      setPlayersInRoom([]);
      setIsHost(false);
      setSocket(null);
    } else{
      const data = await response.json();
      setRoomId(data.roomId);
      setIsHost(true);
      setIsCreatingRoom(true);
      setIsWaitingForRoomCreation(true);
      setErrorMessage('');
    }
  };


  const joinRoom = () => {
    const trimmedRoomId = inputRoomId.trim().toUpperCase();
    if (trimmedRoomId && clientId) {
      setRoomId(trimmedRoomId);
      setIsCreatingRoom(false);
      setErrorMessage(''); // Clear any previous errors
      setGameState('ready');
    }
  };

  const startGame = () => {
    if (socket && isHost) {
      socket.emit('startGame', { roomId });
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leaveWaitingRoom', { roomId, clientId });
    }
    setGameState('waiting');
    setRoomId('');
    setPlayersInRoom([]);
    setIsHost(false);
    setSocket(null);
    setIsCreatingRoom(false);
    setIsWaitingForRoomCreation(false);
    setErrorMessage('');
  };

  const goHome = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center flex flex-col items-center justify-center max-w-md mx-auto p-8">
          <img src="/assets/icon/error.svg" alt="Error" className="w-20 h-20 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to join the game.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
        <div className="max-w-4xl w-full mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: "'Comic Sans MS', cursive"}}>Git, Set, GO!</h1>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            {socket ? (
              <PhaserGameNoSSR socketIo={socket} clientId={clientId} roomId={roomId} />
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Connecting to game server...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Project Lancelot</h1>
          <p className="text-xl text-gray-600">Ultimate Multiplayer Tag Game</p>
        </div>

        {gameState === 'waiting' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Join or Create Room</h2>
              <button
                onClick={goHome}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to Home
              </button>
            </div>
            
            <div className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter room ID to join"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={joinRoom}
                  disabled={!inputRoomId.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-300"
                >
                  Join Room
                </button>
                <button
                  onClick={createRoom}
                  disabled={isWaitingForRoomCreation}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-300"
                >
                  {isWaitingForRoomCreation ? 'Creating Room...' : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'ready' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Room: {roomId}
              </h2>
              <button
                onClick={leaveRoom}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Leave Room
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Players in Room ({playersInRoom.length})
              </h3>
              <div className="space-y-2">
                {playersInRoom.map((player, index) => (
                  <div
                    key={player.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {player.name?.charAt(0) || 'P'}
                      </div>
                      <span className="font-medium">{player.name || 'Anonymous'}</span>
                      {player.id === clientId && (
                        <span className="ml-2 text-sm text-blue-600 font-medium">(You)</span>
                      )}
                    </div>
                    {player.isHost && (
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              {isHost ? (
                <button
                  onClick={startGame}
                  disabled={playersInRoom.length < 1}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-300 font-semibold"
                >
                  Start Game
                </button>
              ) : (
                <p className="text-gray-600">Waiting for host to start the game...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
