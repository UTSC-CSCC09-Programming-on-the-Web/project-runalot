import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Router } from 'express';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export default function gameRouter(io){

const tagRouter = Router();

// --- Game Configuration ---
const PLAYER_SPEED = 220; // pixels per second
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
    };
  }
  gameState.rooms[roomId].players[clientId] = {
    x: 96,
    y: 128,
    vx: 0,
    vy: 0,
    activeKeys: new Set(),
  };

  socket.emit('welcome', { clientId, message: 'Server working' });
  broadcastGameState();

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

      if (player.activeKeys.has('Left')) player.vx = -PLAYER_SPEED;
      if (player.activeKeys.has('Right')) player.vx = PLAYER_SPEED;
      if (player.activeKeys.has('Up')) player.vy = -PLAYER_SPEED;
      if (player.activeKeys.has('Down')) player.vy = PLAYER_SPEED;


      // Calculate potential new position
      let currentX = player.x;
      let currentY = player.y;
      let nextX = currentX + player.vx * deltaTime;
      let nextY = currentY + player.vy * deltaTime;

      let finalX = currentX;
      let finalY = currentY;
      let canMoveX = true; // Assume can move, prove otherwise
      let canMoveY = true; // Assume can move, prove otherwise

    // if (player.vx !== 0 || player.vy !== 0) { // Only log if there's an attempt to move
    //   console.log(`[DebugMove] Start: Client ${clientId}, ActiveKeys: ${Array.from(player.activeKeys)}, Pos: (${currentX.toFixed(2)}, ${currentY.toFixed(2)}), Vel: (${player.vx.toFixed(2)}, ${player.vy.toFixed(2)}), Next: (${nextX.toFixed(2)}, ${nextY.toFixed(2)})`);
    // }

      // --- Collision Detection ---
      // Treat player as a 32x32 tile for collision
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
              // Moving right: snap to left edge of obstacle - playerWidth
              const xTile = Math.floor((currentX + playerWidth - 1) / TILE_SIZE) + 1;
              finalX = xTile * TILE_SIZE - playerWidth;
          } else {
              // Moving left: snap to right edge of obstacle
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
