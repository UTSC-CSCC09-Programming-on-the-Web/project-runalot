import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Router } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { where } from 'sequelize';
import {User} from '../models/user.js';
import { requireAuth } from './auth-router.js';

dotenv.config(); // Load environment variables from .env file

export default function gameRouter(io){

const tagRouter = Router();

tagRouter.use(bodyParser.urlencoded({ extended: false }));
tagRouter.use(bodyParser.json());


// --- Game Configuration ---
const PLAYER_SPEED = 180;
const TAGGER_SPEED = 200;
const SERVER_TICK_RATE = 1000 / 60; // 60 FPS
const TILE_SIZE = 32; // pixels


const OBSTACLE_MATRIX = [
[304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304],
[304,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,304],
[304,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,41,-1,-1,41,-1,41,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,41,-1,41,41,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,304],
[304,-1,41,-1,-1,41,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,-1,41,-1,41,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,41,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,41,-1,-1,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,41,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,41,-1,41,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,41,-1,41,-1,41,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,-1,41,-1,-1,-1,41,41,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,41,-1,-1,-1,-1,-1,-1,41,-1,41,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,41,41,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,304],
[304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304]
];

const MAP_WIDTH_TILES = OBSTACLE_MATRIX[0].length;
const MAP_HEIGHT_TILES = OBSTACLE_MATRIX.length;

// --- Game State ---
let gameState = {
  rooms: {},
  waitingRooms: {}, // New: waiting rooms separate from active game rooms
};


tagRouter.get('/create-room', requireAuth, (req, res) => {
  for (let i = 0; i < 10; i++) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    const roomId = result;
    const isThere = roomId in gameState.waitingRooms;
    if (!isThere) {
      return res.json({ roomId: roomId });
    }
  }
});

// Function to broadcast waiting room updates
const broadcastWaitingRoomUpdate = (roomId) => {
  const waitingRoom = gameState.waitingRooms[roomId];
  if (waitingRoom) {
    io.to(`waiting_${roomId}`).emit('roomUpdate', {
      players: waitingRoom.players,
      host: waitingRoom.host,
      roomId: roomId
    });
  }
};

// Function to broadcast game state to all clients
const broadcastGameState = () => {
  for (const roomId in gameState.rooms) {
    io.to(roomId).emit('gameStateUpdate', { players: gameState.rooms[roomId].players });
  }
};

io.on('connection', (socket) => {

  const { clientId, roomId } = socket.handshake.query;

  if (!clientId || !roomId) {
    console.log('Connection attempt with missing clientId or roomId. Disconnecting.');
    socket.disconnect();
    return;
  }

  console.log(`Client ${clientId} connected to room ${roomId}`);
  
  // Handle waiting room events
  socket.on('joinWaitingRoom', async (data) => {
    const { roomId, clientId, playerName, isCreating } = data;
    console.log(`Player ${clientId} (${playerName}) ${isCreating ? 'creating' : 'joining'} waiting room ${roomId}`);
    
    // Check if room exists when trying to join (not create)
    if (!isCreating && !gameState.waitingRooms[roomId]) {
      console.log(`Room ${roomId} does not exist for player ${clientId}`);
      socket.emit('roomJoinError', { 
        error: 'Room does not exist',
        message: `Room "${roomId}" was not found. Please check the room ID or create a new room.`
      });
      return;
    }

    const ClientJoined = await User.findOne({
      where: { userId: String(clientId) }
    });


    // TODO: Need to have the stripe authentication check here
    if(!ClientJoined || ClientJoined.inRoom){
      socket.emit('roomJoinError', { 
        error: 'Client is already in a room',
        message: `You are already in a room.`
      });
      return;
    }
    
    // When creating, check if room ID is already in use
    if (isCreating && gameState.waitingRooms[roomId]) {
      console.log(`Room ${roomId} already exists for player ${clientId}`);
      socket.emit('roomCreateError', { 
        error: 'Room already exists',
        message: `Room "${roomId}" is already in use. Please try creating a new room.`
      });
      return;
    }
    
    // Create waiting room if it doesn't exist and user is creating
    if (isCreating && !gameState.waitingRooms[roomId]) {
      gameState.waitingRooms[roomId] = {
        players: [],
        host: clientId,
        gameStarted: false
      };
    }
    
    // Add player to waiting room
    const waitingRoom = gameState.waitingRooms[roomId];
    const existingPlayerIndex = waitingRoom.players.findIndex(p => p.id === clientId);
    
    if (existingPlayerIndex === -1) {
      waitingRoom.players.push({
        id: clientId,
        name: playerName,
        isHost: clientId === waitingRoom.host
      });
    }
    
    // Join waiting room socket room
    socket.join(`waiting_${roomId}`);
    
    // Broadcast update to all players in waiting room
    broadcastWaitingRoomUpdate(roomId);
    
    // Notify other players
    socket.to(`waiting_${roomId}`).emit('playerJoined', { playerId: clientId, playerName });
  });
  
  socket.on('leaveWaitingRoom', async (data) => {
    const { roomId, clientId } = data;
    console.log(`Player ${clientId} leaving waiting room ${roomId}`);
    
    const waitingRoom = gameState.waitingRooms[roomId];
    if (waitingRoom) {
      // Remove player from waiting room
      waitingRoom.players = waitingRoom.players.filter(p => p.id !== clientId);

      const removePlayer = await User.findOne({
        where: { userId: String(clientId) }
      });

      if(removePlayer){
        removePlayer.inRoom = false;
        await removePlayer.save();
      }
      
      // If host left, assign new host
      if (waitingRoom.host === clientId && waitingRoom.players.length > 0) {
        waitingRoom.host = waitingRoom.players[0].id;
        waitingRoom.players[0].isHost = true;
      }
      
      // Leave waiting room socket room
      socket.leave(`waiting_${roomId}`);
      
      // If room is empty, delete it
      if (waitingRoom.players.length === 0) {
        delete gameState.waitingRooms[roomId];
      } else {
        broadcastWaitingRoomUpdate(roomId);
      }
      
      // Notify other players
      socket.to(`waiting_${roomId}`).emit('playerLeft', { playerId: clientId });
    }
  });
  
  socket.on('startGame', (data) => {
    const { roomId } = data;
    const waitingRoom = gameState.waitingRooms[roomId];
    
    if (waitingRoom && waitingRoom.host === clientId) {
      console.log(`Host ${clientId} starting game in room ${roomId}`);
      
      // Create game room from waiting room
      if (!gameState.rooms[roomId]) {
        gameState.rooms[roomId] = {
          players: {},
        };
      }
      
      // Move players from waiting room to game room
      waitingRoom.players.forEach(player => {
        gameState.rooms[roomId].players[player.id] = {
          x: 96,
          y: 128,
          vx: 0,
          vy: 0,
          activeKeys: new Set(),
          tagger: false,
        };
      });
      
      // Notify all players in waiting room to start game
      io.to(`waiting_${roomId}`).emit('gameStart', { roomId });
      
      // Move all players from waiting room to game room
      waitingRoom.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.leave(`waiting_${roomId}`);
          playerSocket.join(roomId);
        }
      });
      
      // Clean up waiting room
      delete gameState.waitingRooms[roomId];
      
      // Start broadcasting game state
      broadcastGameState();
    }
  });

  socket.join(roomId); // Client joins the specific room

  if (!gameState.rooms[roomId]) {
    gameState.rooms[roomId] = {
      players: {},
      started: false
    };
  }
  gameState.rooms[roomId].players[clientId] = {
    x: 96,
    y: 128,
    vx: 0,
    vy: 0,
    activeKeys: new Set(),
    tagger: false
  };

  socket.emit('welcome', { clientId, message: 'Server working' });
  broadcastGameState();

  socket.on('startGame', () => {
    const room = gameState.rooms[roomId];
    if (!room || room.started) {
      // Game already started or room doesn't exist
      return;
    }

    console.log(`Client ${clientId} requested to start the game in room ${roomId}`);
    room.started = true; // Mark the game as started

    const playerIds = Object.keys(room.players);
    if (playerIds.length > 0) {
      // Your existing logic to assign roles and positions
      const firstPlayerId = playerIds[0];
      room.players[firstPlayerId].tagger = true;
      room.players[firstPlayerId].x = 300;
      room.players[firstPlayerId].y = 300;
      for (const id of playerIds) {
        if (id !== firstPlayerId) {
          room.players[id].tagger = false;
          room.players[id].x = 96;
          room.players[id].y = 128;
        }
      }
      // Notify all players in the room of their role
      for (const id of playerIds) {
        const playerSocket = io.sockets.sockets.get(id); // Find the socket instance by id
        if(playerSocket){
            const isTagger = room.players[id].tagger;
            // Emit to the specific client's socket
            io.to(id).emit('gameStarted', { tagger: isTagger });
        }
      }
    }
  });

  socket.on('keyPress', (payload) => {
    const room = gameState.rooms[roomId];
    if (!room) return;
    const player = room.players[clientId];
    if (!player) return;
    player.activeKeys.add(payload.key);
  });

  socket.on('keyRelease', (payload) => {
    const room = gameState.rooms[roomId];
    if (!room) return;
    const player = room.players[clientId];
    if (!player) return;
    player.activeKeys.delete(payload.key);
  });

  socket.on('chat', (payload) => {
    io.to(roomId).emit('chat', { senderId: clientId, payload });
  });

  socket.on('disconnect', () => {
    console.log(`Client ${clientId} disconnected from room ${roomId}`);
    
    // Handle waiting room disconnection
    const waitingRoom = gameState.waitingRooms[roomId];
    if (waitingRoom) {
      // Remove player from waiting room
      waitingRoom.players = waitingRoom.players.filter(p => p.id !== clientId);
      
      // If host left, assign new host
      if (waitingRoom.host === clientId && waitingRoom.players.length > 0) {
        waitingRoom.host = waitingRoom.players[0].id;
        waitingRoom.players[0].isHost = true;
      }
      
      // If room is empty, delete it
      if (waitingRoom.players.length === 0) {
        delete gameState.waitingRooms[roomId];
      } else {
        broadcastWaitingRoomUpdate(roomId);
      }
      
      // Notify other players
      socket.to(`waiting_${roomId}`).emit('playerLeft', { playerId: clientId });
    }
    
    // Handle game room disconnection
    const room = gameState.rooms[roomId];
    if (room && room.players[clientId]) {
      delete room.players[clientId];
      if (Object.keys(room.players).length === 0) {
        // If the room is empty, delete it
        console.log(`Room ${roomId} is empty, deleting.`);
        delete gameState.rooms[roomId];
      } else {
        // Otherwise, just broadcast the updated state
        broadcastGameState();
      }
    }
  });
});


function gameLoop() {
  const deltaTime = SERVER_TICK_RATE / 1000; // Delta time in seconds

  Object.keys(gameState.rooms).forEach(roomId => {
    const room = gameState.rooms[roomId];
    if (!room) return;

    Object.keys(room.players).forEach(clientId => {
      const player = room.players[clientId];
      if (!player) return;

      player.vx = 0;
      player.vy = 0;

      if (player.activeKeys.has('Left') && !player.tagger) player.vx = -PLAYER_SPEED;
      if (player.activeKeys.has('Right') && !player.tagger) player.vx = PLAYER_SPEED;
      if (player.activeKeys.has('Up') && !player.tagger) player.vy = -PLAYER_SPEED;
      if (player.activeKeys.has('Down') && !player.tagger) player.vy = PLAYER_SPEED;

      if (player.activeKeys.has('Left') && player.tagger) player.vx = -TAGGER_SPEED;
      if (player.activeKeys.has('Right') && player.tagger) player.vx = TAGGER_SPEED;
      if (player.activeKeys.has('Up') && player.tagger) player.vy = -TAGGER_SPEED;
      if (player.activeKeys.has('Down') && player.tagger) player.vy = TAGGER_SPEED;


      let currentX = player.x;
      let currentY = player.y;
      let nextX = currentX + player.vx * deltaTime;
      let nextY = currentY + player.vy * deltaTime;

      let finalX = currentX;
      let finalY = currentY;
      let canMoveX = true;
      let canMoveY = true;


      const playerWidth = 32;
      const playerHeight = 32;

      // Check X-axis movement
      if (player.vx !== 0) {
          let xLeadingEdge;
          if (player.vx > 0) {
              // Moving right: right edge (no -1)
              xLeadingEdge = nextX + playerWidth - 1;
          } else {
              // Moving left: left edge
              xLeadingEdge = nextX;
          }
          const xTile = Math.max(0, Math.min(MAP_WIDTH_TILES - 1, Math.floor(xLeadingEdge / TILE_SIZE)));

          const yTileTop = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.floor(currentY / TILE_SIZE)));
          const yTileBottom = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.floor((currentY + playerHeight - 1) / TILE_SIZE)));

          const collisionTileXTop = OBSTACLE_MATRIX[yTileTop] && OBSTACLE_MATRIX[yTileTop][xTile];
          const collisionTileXBottom = OBSTACLE_MATRIX[yTileBottom] && OBSTACLE_MATRIX[yTileBottom][xTile];

          if ((collisionTileXTop !== -1 && collisionTileXTop !== undefined) ||
              (collisionTileXBottom !== -1 && collisionTileXBottom !== undefined)) {
              canMoveX = false;
          }
      }
      if (canMoveX) {
          finalX = nextX;
      } else if (player.vx !== 0) {
          // Snap to edge of obstacle
          if (player.vx > 0) {
              const xTile = Math.floor((currentX + playerWidth - 1) / TILE_SIZE) + 1;
              finalX = xTile * TILE_SIZE - playerWidth;
          } else {
              const xTile = Math.floor(currentX / TILE_SIZE) - 1;
              finalX = (xTile + 1) * TILE_SIZE;
          }
      }

      if (player.vy !== 0) {
          let yLeadingEdge;
          if (player.vy > 0) {
              yLeadingEdge = nextY + playerHeight - 1;
          } else {
              yLeadingEdge = nextY;
          }
          const yTile = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.floor(yLeadingEdge / TILE_SIZE)));

          const xTileLeft = Math.max(0, Math.min(MAP_WIDTH_TILES - 1, Math.floor(finalX / TILE_SIZE)));
          const xTileRight = Math.max(0, Math.min(MAP_WIDTH_TILES - 1, Math.floor((finalX + playerWidth - 1) / TILE_SIZE)));

          const collisionTileYLeft = OBSTACLE_MATRIX[yTile] && OBSTACLE_MATRIX[yTile][xTileLeft];
          const collisionTileYRight = OBSTACLE_MATRIX[yTile] && OBSTACLE_MATRIX[yTile][xTileRight];

          if ((collisionTileYLeft !== -1 && collisionTileYLeft !== undefined) ||
              (collisionTileYRight !== -1 && collisionTileYRight !== undefined)) {
              canMoveY = false;
          }
      }
      if (canMoveY) {
          finalY = nextY;
      } else if (player.vy !== 0) {
          if (player.vy > 0) {
              const yTile = Math.floor((currentY + playerHeight - 1) / TILE_SIZE) + 1;
              finalY = yTile * TILE_SIZE - playerHeight;
          } else {
              const yTile = Math.floor(currentY / TILE_SIZE) - 1;
              finalY = (yTile + 1) * TILE_SIZE;
          }
      }

      finalX = Math.max(0, Math.min(finalX, MAP_WIDTH_TILES * TILE_SIZE - playerWidth));
      finalY = Math.max(0, Math.min(finalY, MAP_HEIGHT_TILES * TILE_SIZE - playerHeight));

      player.x = Math.round(finalX);
      player.y = Math.round(finalY);
    });


    // --- Tagging Logic ---
    const playerIds = Object.keys(room.players);
    const taggerIds = playerIds.filter(id => room.players[id].tagger);
    const nonTaggerIds = playerIds.filter(id => !room.players[id].tagger);

    // Only one tagger allowed for this logic
    if (taggerIds.length === 1) {
      const taggerId = taggerIds[0];
      const tagger = room.players[taggerId];
      const playerWidth = 32;
      const playerHeight = 32;

      for (const otherId of nonTaggerIds) {
        const otherPlayer = room.players[otherId];
        // AABB collision detection
        if (
          tagger.x < otherPlayer.x + playerWidth &&
          tagger.x + playerWidth > otherPlayer.x &&
          tagger.y < otherPlayer.y + playerHeight &&
          tagger.y + playerHeight > otherPlayer.y
        ) {
          // Tag occurred! Show game over to tagged user, then disconnect
          const playerSocket = io.sockets.sockets.get(otherId);
          if (playerSocket) {
            playerSocket.emit('gameOver', { message: 'You were tagged! Game over.' });
            setTimeout(() => playerSocket.disconnect(true), 1000); // Give time for message
          }
          delete room.players[otherId];
          break; // Only one tag per frame
        }
      }

      // After possible tag, check if only taggers remain
      const remainingIds = Object.keys(room.players);
      const remainingTaggers = remainingIds.filter(id => room.players[id].tagger);
      if (remainingTaggers.length === remainingIds.length && remainingIds.length > 0) {
        // All remaining are taggers, they win
        for (const id of remainingTaggers) {
          const playerSocket = io.sockets.sockets.get(id);
          if (playerSocket) {
            playerSocket.emit('winGame', { message: 'You win! All others have been tagged.' });
            setTimeout(() => playerSocket.disconnect(true), 1000);
          }
        }
        // Clean up room
        delete gameState.rooms[roomId];
      }
    }

    broadcastGameState(roomId);
  });
}

setInterval(gameLoop, SERVER_TICK_RATE);

return tagRouter;
}
