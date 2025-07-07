import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Router } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

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
    const room = gameState.rooms[roomId];
    if (room && room.players[clientId]) {
      delete room.players[clientId];
      if (Object.keys(room.players).length === 0) {
        // If the room is empty, delete it
        console.log(`Room ${roomId} is empty, deleting.`);
        delete gameState.rooms[roomId];
      } else {
        // Otherwise, just broadcast the updated state
        broadcastGameState(roomId);
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
      let canMoveX = true; // Assume can move, prove otherwise
      let canMoveY = true; // Assume can move, prove otherwise


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

          // Check tiles at player's current top and bottom Y for the new X position
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

      // Check Y-axis movement
      if (player.vy !== 0) {
          let yLeadingEdge;
          if (player.vy > 0) {
              // Moving down: bottom edge (no -1)
              yLeadingEdge = nextY + playerHeight - 1;
          } else {
              // Moving up: top edge
              yLeadingEdge = nextY;
          }
          const yTile = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.floor(yLeadingEdge / TILE_SIZE)));

          // Check tiles at player's resolved X (finalX) left and right for the new Y position
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
          // Snap to edge of obstacle
          if (player.vy > 0) {
              // Moving down: snap to top edge of obstacle - playerHeight
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

    broadcastGameState(roomId);
  });
}

setInterval(gameLoop, SERVER_TICK_RATE);

return tagRouter;
}
