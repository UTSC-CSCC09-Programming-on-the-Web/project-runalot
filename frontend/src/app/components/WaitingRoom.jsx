"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  const [tagger, setTagger] = useState(false);
  const [playerRoles, setPlayerRoles] = useState(null); // { [id]: { tagger, order } }
  const initialRoleRef = useRef(null); // Store the initial role for PhaserGame
  const [gameStarted, setGameStarted] = useState(false);
  const [order, setOrder] = useState(1);


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

      // Listen for gameStarted (role assignment)
      socketConnection.on('gameStarted', (data) => {
        if (data && data.tagger !== undefined) {
          setGameStarted(true);
          setOrder(data.order || 1);
          setTagger(data.tagger);
          initialRoleRef.current = data.tagger ? 'You are the TAGGER!' : 'You are a RUNNER!';
        }
        if (data && data.playerRoles) {
          setPlayerRoles(data.playerRoles);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black relative overflow-hidden">
        {/* Spooky vignette overlay */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)', mixBlendMode: 'multiply'}} />
        {/* Spooky mist overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 animate-spookyMist" style={{background: 'linear-gradient(120deg, rgba(30,30,40,0.18) 0%, rgba(80,80,100,0.12) 100%)', filter: 'blur(2.5px)'}} />
        <div className="text-center relative z-30">
          <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
          <p className="text-2xl font-bold text-gray-100 animate-spookyGlow" style={{fontFamily: 'Creepster, Luckiest Guy, Comic Sans MS, cursive', letterSpacing: 2, textShadow: '0 0 16px #fff, 0 0 32px #a855f7'}}>Loading...</p>
        </div>
        <style jsx global>{`
          @keyframes spookyMist {
            0% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
            50% { opacity: 0.85; filter: blur(3.5px) brightness(1.1); }
            100% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
          }
          .animate-spookyMist { animation: spookyMist 4s ease-in-out infinite; }
          @keyframes spookyGlow {
            0%, 100% { text-shadow: 0 0 24px #fff, 0 0 48px #a855f7; }
            50% { text-shadow: 0 0 48px #fff, 0 0 64px #a855f7; }
          }
          .animate-spookyGlow { animation: spookyGlow 2.8s alternate infinite; }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center flex flex-col items-center justify-center max-w-md mx-auto p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <img src="/assets/icon/error.svg" alt="Error" className="w-20 h-20 mb-4 opacity-80" />
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-100 mb-4">Authentication Required</h2>
          <p className="text-gray-500 dark:text-gray-300 mb-6">Please log in to join the game.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-800 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    console.log(playerRoles);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black pt-0 pb-6 px-4 relative overflow-hidden">
        {/* Spooky vignette overlay */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)', mixBlendMode: 'multiply'}} />
        {/* Spooky mist overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 animate-spookyMist" style={{background: 'linear-gradient(120deg, rgba(30,30,40,0.18) 0%, rgba(80,80,100,0.12) 100%)', filter: 'blur(2.5px)'}} />
        {/* Leave Game Button at Top Left */}
        <button
          onClick={leaveRoom}
          className="absolute font-medium cursor-pointer top-4 left-4 bg-gray-900 border border-red-400 text-red-600 px-4 py-2 rounded-lg shadow transition duration-200 z-50 hover:bg-red-700 hover:text-white animate-spookyPulse"
        >
          Leave Game
        </button>
        <div className="max-w-4xl w-auto mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-100 mt-2 mb-0" style={{fontFamily: 'Creepster, Comic Sans MS, cursive', letterSpacing: 2}}>
              Git, Set, GO!
            </h1>
          </div>
          <div className="bg-gray-900 rounded-xl shadow-md p-4 mb-4 border border-gray-700">
            {(socket && gameStarted) ? (
              <PhaserGameNoSSR
                socketIo={socket}
                clientId={clientId}
                roomId={roomId}
                isTagger={tagger}
                order={order}
                playerRoles={playerRoles}
                initialRoleMessage={initialRoleRef.current}
              />
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300 font-medium">Connecting to game server...</p>
              </div>
            )}
          </div>
          {/* Countdown Timer Below Game */}
          {gameStarted && <CountdownTimer key={gameState} />}
        </div>
        <style jsx global>{`
          @keyframes spookyMist {
            0% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
            50% { opacity: 0.85; filter: blur(3.5px) brightness(1.1); }
            100% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
          }
          .animate-spookyMist { animation: spookyMist 4s ease-in-out infinite; }
          @keyframes spookyGlow {
            0%, 100% { text-shadow: 0 0 24px #fff, 0 0 48px #a855f7; }
            50% { text-shadow: 0 0 48px #fff, 0 0 64px #a855f7; }
          }
          .animate-spookyGlow { animation: spookyGlow 2.8s alternate infinite; }
          @keyframes spookyPulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          .animate-spookyPulse { animation: spookyPulse 2.2s infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black py-12 px-4 relative overflow-hidden">
      {/* Spooky vignette overlay */}
      <div className="pointer-events-none absolute inset-0 z-10" style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)', mixBlendMode: 'multiply'}} />
      {/* Spooky mist overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 animate-spookyMist" style={{background: 'linear-gradient(120deg, rgba(30,30,40,0.18) 0%, rgba(80,80,100,0.12) 100%)', filter: 'blur(2.5px)'}} />
      <div className="max-w-4xl mx-auto relative z-30">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-100 mb-2" style={{fontFamily: 'Creepster, Luckiest Guy, Comic Sans MS, cursive', letterSpacing: 2}}>TAGGIT</h1>
          <p className="text-lg text-gray-300">Get ready to play the ultimate online tag game!</p>
        </div>

        {gameState === 'waiting' && (
          <div className="bg-gray-900 rounded-2xl shadow-md p-8 max-w-md mx-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-red-900 animate-spookyPulse">Join or Create Room</h2>
              <button
                onClick={goHome}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ← Back to Home
              </button>
            </div>
            <div className="space-y-4">
              {errorMessage && (
                <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded-lg animate-spookyPulse">
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter room ID to join"
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-800 text-gray-100"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={joinRoom}
                  disabled={!inputRoomId.trim()}
                  className="flex-1 bg-indigo-800 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-indigo-700 disabled:bg-black disabled:cursor-not-allowed transition duration-200 font-semibold"
                >
                  Join Room
                </button>
                <button
                  onClick={createRoom}
                  disabled={isWaitingForRoomCreation}
                  className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-indigo-700 disabled:bg-black disabled:cursor-not-allowed transition duration-200 font-semibold"
                >
                  {isWaitingForRoomCreation ? 'Creating Room...' : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'ready' && (
          <div className="bg-gray-900 rounded-2xl shadow-md p-8 max-w-2xl mx-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">
                Room: {roomId}
              </h2>
              <button
                onClick={leaveRoom}
                className="text-red-400 border border-red-400 hover:text-red-600 font-bold rounded-2xl px-4 py-2 cursor-pointer transition-all duration-200 hover:border-red-600"
              >
                Leave Room
              </button>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">
                Players in Room ({playersInRoom.length})
              </h3>
              <div className="space-y-2">
                {playersInRoom.map((player, index) => (
                  <div
                    key={player.id || index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {player.name?.charAt(0) || 'P'}
                      </div>
                      <span className="font-medium text-gray-100">{player.name || 'Anonymous'}</span>
                      {player.id === clientId && (
                        <span className="ml-2 text-sm text-indigo-300 font-medium">(You)</span>
                      )}
                    </div>
                    {player.isHost && (
                      <span className="text-sm bg-yellow-900 text-yellow-200 px-2 py-1 rounded">
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
                  className="bg-indigo-800 text-white px-8 py-3 rounded-lg hover:bg-indigo-500 cursor-pointer disabled:bg-gray-700 disabled:cursor-not-allowed transition duration-200 font-semibold"
                >
                  Start Game
                </button>
              ) : (
                <p className="text-gray-300">Waiting for host to start the game...</p>
              )}
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes spookyMist {
          0% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
          50% { opacity: 0.85; filter: blur(3.5px) brightness(1.1); }
          100% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
        }
        .animate-spookyMist { animation: spookyMist 4s ease-in-out infinite; }
        @keyframes spookyGlow {
          0%, 100% { text-shadow: 0 0 24px #fff, 0 0 48px #a855f7; }
          50% { text-shadow: 0 0 48px #fff, 0 0 64px #a855f7; }
        }
        .animate-spookyGlow { animation: spookyGlow 2.8s alternate infinite; }
        @keyframes spookyPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        .animate-spookyPulse { animation: spookyPulse 2.2s infinite; }
      `}</style>
    </div>
  );
}


function CountdownTimer() {
  const [secondsLeft, setSecondsLeft] = React.useState(120);
  React.useEffect(() => {
    setSecondsLeft(120);
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [/* only on mount and remount */]);
  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  return (
    <div className="w-full flex justify-center mt-2">
      <div className="bg-gray-900 text-white px-6 py-2 rounded-lg text-lg font-mono shadow" style={{minWidth: 160, textAlign: 'center'}}>
        Time Left: {min}:{sec.toString().padStart(2, '0')}
      </div>
    </div>
  );
}
